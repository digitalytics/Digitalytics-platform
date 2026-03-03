/**
 * Billing service — orchestrates billing-engine (pure) + Prisma.
 *
 * Key design decisions for Stripe readiness:
 *   - Invoice status flow: DRAFT → PENDING (Pay Now clicked, Stripe session created)
 *                          → PAID (Stripe webhook confirms payment)
 *                          → OVERDUE (scheduled job after due date)
 *   - stripeCheckoutSessionId set when Pay Now is clicked
 *   - stripePaymentIntentId set when Stripe webhook fires
 *   - ensureCurrentInvoice is idempotent — safe to call on every page load
 */

import { prisma } from '@/lib/prisma';
import {
  buildLineItems,
  computeSubtotal,
  isInvoiceOverdue,
  generateInvoiceNumber,
  computeAgentBillingPeriod,
  type AgentInput,
} from '@/lib/billing-engine';

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

/** Minimal invoice shape needed by pure decision logic */
export interface SlimInvoice {
  id:     string;
  status: InvoiceStatus;
}

export type InvoiceAction =
  | { type: 'create' }
  | { type: 'recalculate'; invoiceId: string }
  | { type: 'noop';        invoiceId: string };

// ── Pay-priority helpers (exported for tests + client) ────────────────────────

/**
 * Returns the oldest OVERDUE invoice (by periodStart ASC), or null if none.
 */
export function getOldestOverdueInvoice(
  invoices: Array<{ id: string; status: string; periodStart: string }>
): { id: string; status: string; periodStart: string } | null {
  const overdue = invoices.filter(inv => inv.status === 'OVERDUE');
  if (overdue.length === 0) return null;
  return overdue.sort((a, b) => a.periodStart.localeCompare(b.periodStart))[0];
}

/**
 * Determines whether Pay Now is enabled for this invoice.
 * overdueBlocker: result of getOldestOverdueInvoice() called on all invoices.
 */
export function resolveInvoicePayability(
  invoice: { id: string; status: string },
  overdueBlocker: { id: string } | null,
): { canPay: boolean; blockMessage: string | null } {
  // Already settled — cannot pay
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
    return { canPay: false, blockMessage: null };
  }
  // Payment already in-flight
  if (invoice.status === 'PENDING') {
    return { canPay: false, blockMessage: null };
  }
  // DRAFT or OVERDUE — check blocker
  if (overdueBlocker && overdueBlocker.id !== invoice.id) {
    return { canPay: false, blockMessage: 'Please pay overdue invoice first.' };
  }
  return { canPay: true, blockMessage: null };
}

// ── Pure helpers (exported for tests) ─────────────────────────────────────────

/**
 * Decides what to do for the current billing period — pure, no DB calls.
 *
 * | existing status | action      |
 * |-----------------|-------------|
 * | null            | create      |
 * | CANCELLED       | create      |
 * | DRAFT           | recalculate |
 * | PENDING         | noop        |
 * | PAID            | noop        |
 * | OVERDUE         | noop        |
 */
/**
 * Returns the label and disabled state for the persistent "Get Bill" header button.
 *
 * | status      | label        | disabled |
 * |-------------|--------------|---------|
 * | null        | Get Bill     | false   |
 * | DRAFT       | Update Bill  | false   |
 * | CANCELLED   | Get Bill     | false   |
 * | PENDING     | Get Bill     | true    |
 * | PAID        | Get Bill     | true    |
 * | OVERDUE     | Get Bill     | true    |
 */
export function resolveGetBillButton(
  status: InvoiceStatus | null
): { label: string; disabled: boolean } {
  if (status === 'DRAFT')               return { label: 'Update Bill', disabled: false };
  if (!status || status === 'CANCELLED') return { label: 'Get Bill',    disabled: false };
  // PAID — invoice is paid but new calls may have accrued; allow supplement invoice
  if (status === 'PAID')                return { label: 'Get Bill',    disabled: false };
  // PENDING / OVERDUE — payment in-flight or past-due; don't regenerate
  return { label: 'Get Bill', disabled: true };
}

export function resolveInvoiceAction(existing: SlimInvoice | null): InvoiceAction {
  if (!existing || existing.status === 'CANCELLED') return { type: 'create' };
  if (existing.status === 'DRAFT') return { type: 'recalculate', invoiceId: existing.id };
  return { type: 'noop', invoiceId: existing.id };
}

/**
 * Generates a unique invoice number for a user + period.
 * Increments a numeric suffix until a free slot is found.
 * `existingNumbers` should include ALL invoice numbers that match the base prefix
 * (including cancelled ones that still hold the number in the unique index).
 */
export function buildInvoiceNumber(
  userId:          string,
  year:            number,
  month:           number,    // 1-based
  existingNumbers: Set<string>,
): string {
  const yyyymm = `${year}${String(month).padStart(2, '0')}`;
  const base   = `INV-${yyyymm}-${userId.slice(0, 6).toUpperCase()}`;
  if (!existingNumbers.has(base)) return base;
  let suffix = 2;
  while (existingNumbers.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

// ── Async service ──────────────────────────────────────────────────────────────

/**
 * Automatically transitions any DRAFT/PENDING invoices whose billing period
 * has closed to OVERDUE — no admin action needed.
 * Safe to call on every page load (only updates when necessary).
 */
export async function autoMarkOverdueForUser(userId: string): Promise<void> {
  const now = new Date();

  // Fetch only statuses that could become overdue
  const candidates = await prisma.invoice.findMany({
    where:  { userId, status: { in: ['DRAFT', 'PENDING'] } },
    select: { id: true, status: true, periodStart: true },
  });

  const overdueIds = candidates
    .filter(inv => isInvoiceOverdue(inv.status, inv.periodStart, now))
    .map(inv => inv.id);

  if (overdueIds.length === 0) return;

  await prisma.invoice.updateMany({
    where: { id: { in: overdueIds } },
    data:  { status: 'OVERDUE' },
  });
}

/**
 * Ensures a current-month invoice exists for the user.
 * Auto-generates or recalculates as needed (idempotent).
 *
 * Priority order for current-period invoices:
 *   1. DRAFT     → recalculate (picks up any new usage)
 *   2. PENDING   → noop (payment in-flight, don't touch)
 *   3. OVERDUE   → noop (past-due, handled by payment flow)
 *   4. PAID only → create a new DRAFT supplement invoice for remaining calls
 *   5. None      → create a fresh DRAFT invoice
 *
 * Returns the invoice (with line items) after any writes.
 */
export async function ensureCurrentInvoice(userId: string) {
  const now         = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Find ALL non-cancelled invoices for the current period (paidAt needed for supplement start)
  const periodInvoices = await prisma.invoice.findMany({
    where:  { userId, periodStart, status: { not: 'CANCELLED' } },
    select: { id: true, status: true, paidAt: true },
  });

  // If a PAID invoice exists for this period, supplement invoices must only count calls
  // that occurred AFTER that payment — otherwise the same calls get billed twice.
  const mostRecentPaidAt = periodInvoices
    .filter(inv => inv.status === 'PAID' && inv.paidAt != null)
    .reduce((latest: Date | null, inv) =>
      latest == null || inv.paidAt! > latest ? inv.paidAt! : latest, null
    );

  // 1. Prefer DRAFT — recalculate it to pick up new usage
  const draftInvoice = periodInvoices.find(inv => inv.status === 'DRAFT');
  if (draftInvoice) {
    // Use the recalculate path by synthesising the action
    const action = { type: 'recalculate' as const, invoiceId: draftInvoice.id };

    // Fetch user's agent assignments (needed below)
    const userAgentsForRecalc = await prisma.userAgent.findMany({
      where:   { userId },
      include: { agent: true },
    });
    if (userAgentsForRecalc.length === 0) return null;

    const agentInputsForRecalc: AgentInput[] = await Promise.all(
      userAgentsForRecalc.map(async ua => {
        const agentRetellId = ua.agent.retellAgentId;
        const setupFeeAlreadyBilled = ua.setupFee
          ? !!(await prisma.invoiceLineItem.findFirst({
              where: {
                type:    'SETUP_FEE',
                agentId: agentRetellId,
                invoice: {
                  userId,
                  status: { not: 'CANCELLED' },
                  id:     { not: action.invoiceId },
                },
              },
            }))
          : false;
        // Monthly fee: already on a different non-cancelled invoice for this same period?
        const monthlyFeeAlreadyBilled = ua.monthlyFee
          ? !!(await prisma.invoiceLineItem.findFirst({
              where: {
                type:    'MONTHLY_FEE',
                agentId: agentRetellId,
                invoice: {
                  userId,
                  periodStart,
                  status: { not: 'CANCELLED' },
                  id:     { not: action.invoiceId },
                },
              },
            }))
          : false;
        // For supplement invoices (DRAFT alongside a PAID invoice for this period),
        // only count calls AFTER the most recent payment to avoid double-billing.
        const baseStart     = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
        const effectiveStart = mostRecentPaidAt && mostRecentPaidAt > baseStart
          ? mostRecentPaidAt
          : baseStart;
        const usageAgg = ua.costMultiplier
          ? await prisma.call.aggregate({
              where: {
                agentId:        agentRetellId,
                startTimestamp: { gte: effectiveStart, lte: periodEnd },
                totalCost:      { not: null },
              },
              _sum: { totalCost: true },
            })
          : null;
        return {
          retellAgentId:           agentRetellId,
          agentName:               ua.agent.name,
          setupFee:                ua.setupFee        ? Number(ua.setupFee)        : null,
          setupFeeAlreadyBilled,
          monthlyFee:              ua.monthlyFee      ? Number(ua.monthlyFee)      : null,
          monthlyFeeAlreadyBilled,
          costMultiplier:          ua.costMultiplier  ? Number(ua.costMultiplier)  : null,
          assignedAt:              ua.assignedAt,
          periodStart,
          periodEnd,
          usageCost:               Number(usageAgg?._sum.totalCost ?? 0),
        };
      })
    );

    const lineItemsForRecalc = buildLineItems(agentInputsForRecalc);
    await prisma.$transaction(async tx => {
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: action.invoiceId } });
      if (lineItemsForRecalc.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: lineItemsForRecalc.map(item => ({
            invoiceId:   action.invoiceId,
            type:        item.type,
            agentId:     item.agentId,
            agentName:   item.agentName,
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            total:       item.total,
          })),
        });
      }
      const newSubtotal = Math.round(lineItemsForRecalc.reduce((s, l) => s + l.total, 0) * 100) / 100;
      await tx.invoice.update({ where: { id: action.invoiceId }, data: { subtotal: newSubtotal, total: newSubtotal } });
    });
    return prisma.invoice.findUnique({
      where:   { id: action.invoiceId },
      include: { lineItems: { orderBy: { type: 'asc' } } },
    });
  }

  // 2. PENDING or OVERDUE → noop (payment in-flight or past-due)
  const lockedInvoice = periodInvoices.find(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE');
  if (lockedInvoice) {
    return prisma.invoice.findUnique({
      where:   { id: lockedInvoice.id },
      include: { lineItems: { orderBy: { type: 'asc' } } },
    });
  }

  // 3. All PAID (supplement) or no invoices → CREATE fresh DRAFT
  // Fetch user's agent assignments
  const userAgents = await prisma.userAgent.findMany({
    where:   { userId },
    include: { agent: true },
  });

  if (userAgents.length === 0) return null;

  // Build agent inputs (resolve setup-fee billing status + usage)
  const agentInputs: AgentInput[] = await Promise.all(
    userAgents.map(async ua => {
      const agentRetellId = ua.agent.retellAgentId;

      // Setup fee already billed on any non-cancelled invoice?
      const setupFeeAlreadyBilled = ua.setupFee
        ? !!(await prisma.invoiceLineItem.findFirst({
            where: {
              type:    'SETUP_FEE',
              agentId: agentRetellId,
              invoice: { userId, status: { not: 'CANCELLED' } },
            },
          }))
        : false;

      // Monthly fee: already on any non-cancelled invoice for this same period?
      const monthlyFeeAlreadyBilled = ua.monthlyFee
        ? !!(await prisma.invoiceLineItem.findFirst({
            where: {
              type:    'MONTHLY_FEE',
              agentId: agentRetellId,
              invoice: {
                userId,
                periodStart,
                status: { not: 'CANCELLED' },
              },
            },
          }))
        : false;

      // Supplement invoice: only count calls AFTER the most recent payment to avoid double-billing.
      const baseStart      = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
      const effectiveStart = mostRecentPaidAt && mostRecentPaidAt > baseStart
        ? mostRecentPaidAt
        : baseStart;
      const usageAgg = ua.costMultiplier
        ? await prisma.call.aggregate({
            where: {
              agentId:        agentRetellId,
              startTimestamp: { gte: effectiveStart, lte: periodEnd },
              totalCost:      { not: null },
            },
            _sum: { totalCost: true },
          })
        : null;

      return {
        retellAgentId:           agentRetellId,
        agentName:               ua.agent.name,
        setupFee:                ua.setupFee        ? Number(ua.setupFee)        : null,
        setupFeeAlreadyBilled,
        monthlyFee:              ua.monthlyFee      ? Number(ua.monthlyFee)      : null,
        monthlyFeeAlreadyBilled,
        costMultiplier:          ua.costMultiplier  ? Number(ua.costMultiplier)  : null,
        assignedAt:              ua.assignedAt,
        periodStart,
        periodEnd,
        usageCost:               Number(usageAgg?._sum.totalCost ?? 0),
      };
    })
  );

  const lineItems = buildLineItems(agentInputs);
  if (lineItems.length === 0) return null;
  const subtotal = computeSubtotal(lineItems);

  // ── CREATE fresh invoice ────────────────────────────────────────────────────
  const takenNumbers = new Set(
    (await prisma.invoice.findMany({
      where:  { invoiceNumber: { startsWith: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${userId.slice(0, 6).toUpperCase()}` } },
      select: { invoiceNumber: true },
    })).map(r => r.invoiceNumber)
  );
  const invoiceNumber = buildInvoiceNumber(
    userId,
    now.getFullYear(),
    now.getMonth() + 1,   // getMonth() is 0-based
    takenNumbers,
  );

  const invoice = await prisma.$transaction(async tx => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        userId,
        periodStart,
        periodEnd,
        status:          'DRAFT',
        subtotal,
        total:           subtotal,
        isAutoGenerated: true,   // user-triggered auto-generation
      },
    });
    await tx.invoiceLineItem.createMany({
      data: lineItems.map(item => ({
        invoiceId:   created.id,
        type:        item.type,
        agentId:     item.agentId,
        agentName:   item.agentName,
        description: item.description,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        total:       item.total,
      })),
    });
    return created;
  });

  return prisma.invoice.findUnique({
    where:   { id: invoice.id },
    include: { lineItems: { orderBy: { type: 'asc' } } },
  });
}

/**
 * Convenience wrapper: auto-generates current-month invoice if missing,
 * then applies 8-day overdue transition. Call on every billing page load.
 * No cron required — lazy evaluation on user access.
 */
export async function ensureBillingUpToDate(userId: string): Promise<void> {
  await ensureCurrentInvoice(userId);
  await autoMarkOverdueForUser(userId);
}

// ── Per-agent anniversary billing ─────────────────────────────────────────────

/**
 * Generates a unique invoice number for a specific user-agent pair and period.
 * Format (MONTHLY): 'INV-YYYYMM-USERID6-UAGENTID6'
 * Format (SETUP):   'INV-SETUP-YYYYMM-USERID6-UAGENTID6'
 */
export function buildAgentInvoiceNumber(
  userId:          string,
  userAgentId:     string,
  year:            number,
  month:           number,  // 1-based
  invoiceType:     'SETUP' | 'MONTHLY',
  existingNumbers: Set<string>,
): string {
  const yyyymm = `${year}${String(month).padStart(2, '0')}`;
  const uPart  = userId.slice(0, 6).toUpperCase();
  const aPart  = userAgentId.slice(0, 6).toUpperCase();
  const prefix = invoiceType === 'SETUP' ? 'INV-SETUP' : 'INV';
  const base   = `${prefix}-${yyyymm}-${uPart}-${aPart}`;
  return generateInvoiceNumber(base, existingNumbers);
}

/**
 * Creates a SETUP invoice immediately when an agent is assigned (if setupFee > 0).
 * Idempotent — no-op if a non-cancelled SETUP invoice already exists for this
 * user-agent pair.
 */
export async function createSetupFeeInvoiceForAgent(userAgentId: string): Promise<void> {
  const ua = await prisma.userAgent.findUnique({
    where:   { id: userAgentId },
    include: { agent: true },
  });
  if (!ua || !ua.setupFee) return;

  // Idempotent: skip if a non-cancelled SETUP invoice already exists
  const existing = await prisma.invoice.findFirst({
    where: { userAgentId, invoiceType: 'SETUP', status: { not: 'CANCELLED' } },
  });
  if (existing) return;

  const now = new Date();
  const takenNumbers = new Set(
    (await prisma.invoice.findMany({
      where:  { invoiceNumber: { startsWith: 'INV-SETUP-' } },
      select: { invoiceNumber: true },
    })).map(r => r.invoiceNumber)
  );
  const invoiceNumber = buildAgentInvoiceNumber(
    ua.userId, userAgentId, now.getFullYear(), now.getMonth() + 1, 'SETUP', takenNumbers
  );
  const fee = Number(ua.setupFee);

  await prisma.$transaction(async tx => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        userId:          ua.userId,
        userAgentId,
        invoiceType:     'SETUP',
        periodStart:     ua.assignedAt,
        periodEnd:       ua.assignedAt,
        status:          'DRAFT',
        subtotal:        fee,
        total:           fee,
        isAutoGenerated: true,
      },
    });
    await tx.invoiceLineItem.create({
      data: {
        invoiceId:   inv.id,
        type:        'SETUP_FEE',
        agentId:     ua.agent.retellAgentId,
        agentName:   ua.agent.name,
        description: `Setup fee — ${ua.agent.name}`,
        quantity:    1,
        unitPrice:   fee,
        total:       fee,
      },
    });
  });
}

/**
 * Ensures a monthly invoice exists for the agent's current anniversary period.
 * Auto-generates or recalculates as needed (idempotent).
 * Setup fee is always excluded — it lives on its own SETUP invoice.
 */
export async function ensureMonthlyInvoiceForAgent(userAgentId: string): Promise<void> {
  const ua = await prisma.userAgent.findUnique({
    where:   { id: userAgentId },
    include: { agent: true },
  });
  if (!ua) return;

  const { periodStart, periodEnd } = computeAgentBillingPeriod(ua.assignedAt, new Date());

  const existing = await prisma.invoice.findFirst({
    where:  { userAgentId, invoiceType: 'MONTHLY', periodStart, status: { not: 'CANCELLED' } },
    select: { id: true, status: true },
  });

  const action = resolveInvoiceAction(
    existing ? { id: existing.id, status: existing.status as InvoiceStatus } : null
  );
  if (action.type === 'noop') return;

  // Build line items — setup fee always excluded (lives on its own SETUP invoice)
  const usageAgg = ua.costMultiplier
    ? await prisma.call.aggregate({
        where: {
          agentId:        ua.agent.retellAgentId,
          startTimestamp: { gte: periodStart, lte: periodEnd },
          totalCost:      { not: null },
        },
        _sum: { totalCost: true },
      })
    : null;

  const agentInput: AgentInput = {
    retellAgentId:           ua.agent.retellAgentId,
    agentName:               ua.agent.name,
    setupFee:                null,  // never on monthly invoice
    setupFeeAlreadyBilled:   true,
    monthlyFee:              ua.monthlyFee     ? Number(ua.monthlyFee)     : null,
    monthlyFeeAlreadyBilled: false,
    costMultiplier:          ua.costMultiplier ? Number(ua.costMultiplier) : null,
    assignedAt:              ua.assignedAt,
    periodStart,
    periodEnd,
    usageCost:               Number(usageAgg?._sum.totalCost ?? 0),
  };

  const lineItems = buildLineItems([agentInput]);
  const subtotal  = computeSubtotal(lineItems);

  if (action.type === 'create') {
    if (lineItems.length === 0) return; // nothing to bill yet
    const now = new Date();
    const takenNumbers = new Set(
      (await prisma.invoice.findMany({
        where:  { invoiceNumber: { startsWith: `INV-${now.getFullYear()}` } },
        select: { invoiceNumber: true },
      })).map(r => r.invoiceNumber)
    );
    const invoiceNumber = buildAgentInvoiceNumber(
      ua.userId, userAgentId, now.getFullYear(), now.getMonth() + 1, 'MONTHLY', takenNumbers
    );
    await prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          userId:          ua.userId,
          userAgentId,
          invoiceType:     'MONTHLY',
          periodStart,
          periodEnd,
          status:          'DRAFT',
          subtotal,
          total:           subtotal,
          isAutoGenerated: true,
        },
      });
      if (lineItems.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: lineItems.map(li => ({ invoiceId: inv.id, ...li })),
        });
      }
    });
  } else if (action.type === 'recalculate') {
    await prisma.$transaction(async tx => {
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: action.invoiceId } });
      if (lineItems.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: lineItems.map(li => ({ invoiceId: action.invoiceId, ...li })),
        });
      }
      await tx.invoice.update({
        where: { id: action.invoiceId },
        data:  { subtotal, total: subtotal },
      });
    });
  }
}

/**
 * Ensures all monthly invoices are up-to-date for all of a user's agents,
 * then applies overdue transitions. Call on every billing page load.
 */
export async function ensureBillingUpToDateForUser(userId: string): Promise<void> {
  const userAgents = await prisma.userAgent.findMany({ where: { userId }, select: { id: true } });
  await Promise.all(userAgents.map(ua => ensureMonthlyInvoiceForAgent(ua.id)));
  await autoMarkOverdueForUser(userId);
}
