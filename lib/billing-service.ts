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
    select: { id: true, status: true, periodEnd: true },
  });

  const overdueIds = candidates
    .filter(inv => isInvoiceOverdue(inv.status, inv.periodEnd, now))
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
