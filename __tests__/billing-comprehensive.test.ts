/**
 * Comprehensive Billing System Tests
 *
 * Validates the full billing pipeline for correctness and potential bugs.
 * Covers areas not tested by the focused unit-test files:
 *
 *  1. Pure engine — additional edge cases (Dec→Jan, leap year, zero fees, large numbers)
 *  2. Anniversary billing ↔ overdue detection interaction
 *  3. Async service functions (autoMarkOverdueForUser, createSetupFeeInvoiceForAgent,
 *     ensureMonthlyInvoiceForAgent) with mocked Prisma
 *  4. Pay route — PENDING invoice blocks second payment session
 *  5. Multi-invoice scenarios (overdue blocker across agents)
 */

// ── Unified Prisma mocks (ONE declaration — second one would silently overwrite) ──

const mockInvoiceFindMany   = jest.fn();
const mockInvoiceFindFirst  = jest.fn();
const mockInvoiceUpdateMany = jest.fn();
const mockInvoiceUpdate     = jest.fn();   // used by pay route
const mockUserFindUnique    = jest.fn();   // used by pay route
const mockUserUpdate        = jest.fn();   // used by pay route
const mockUserAgentFindUnique = jest.fn();
const mockUserAgentFindMany   = jest.fn();
const mockCallAggregate       = jest.fn();

// Transaction-scoped mocks (passed as tx client inside $transaction)
const mockTxInvoiceCreate      = jest.fn();
const mockTxInvoiceUpdate      = jest.fn();
const mockTxLineItemCreate     = jest.fn();
const mockTxLineItemCreateMany = jest.fn();
const mockTxLineItemDeleteMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findMany:   (...args: unknown[]) => mockInvoiceFindMany(...args),
      findFirst:  (...args: unknown[]) => mockInvoiceFindFirst(...args),
      updateMany: (...args: unknown[]) => mockInvoiceUpdateMany(...args),
      update:     (...args: unknown[]) => mockInvoiceUpdate(...args),
    },
    invoiceLineItem: {},
    userAgent: {
      findUnique: (...args: unknown[]) => mockUserAgentFindUnique(...args),
      findMany:   (...args: unknown[]) => mockUserAgentFindMany(...args),
    },
    call: {
      aggregate: (...args: unknown[]) => mockCallAggregate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update:     (...args: unknown[]) => mockUserUpdate(...args),
    },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        invoice: {
          create: (...args: unknown[]) => mockTxInvoiceCreate(...args),
          update: (...args: unknown[]) => mockTxInvoiceUpdate(...args),
        },
        invoiceLineItem: {
          create:     (...args: unknown[]) => mockTxLineItemCreate(...args),
          createMany: (...args: unknown[]) => mockTxLineItemCreateMany(...args),
          deleteMany: (...args: unknown[]) => mockTxLineItemDeleteMany(...args),
        },
      }),
  },
}));

// Auth mock (for pay route section)
const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

// Stripe mock (for pay route section)
const mockStripeCheckoutCreate  = jest.fn();
const mockStripeCustomersCreate = jest.fn();
jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: (...args: unknown[]) => mockStripeCustomersCreate(...args) },
    checkout: {
      sessions: { create: (...args: unknown[]) => mockStripeCheckoutCreate(...args) },
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  computeAgentBillingPeriod,
  isInvoiceOverdue,
  buildLineItems,
  computeSubtotal,
  type AgentInput,
} from '../lib/billing-engine';

import {
  getOldestOverdueInvoice,
  resolveInvoicePayability,
  autoMarkOverdueForUser,
  createSetupFeeInvoiceForAgent,
  ensureMonthlyInvoiceForAgent,
  ensureBillingUpToDateForUser,
} from '../lib/billing-service';

import { POST as payPOST } from '../app/api/billing/invoices/[invoiceId]/pay/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function d(iso: string) { return new Date(iso); }

function makeAgent(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    retellAgentId:           'agent-001',
    agentName:               'Test Agent',
    setupFee:                null,
    setupFeeAlreadyBilled:   false,
    monthlyFee:              null,
    monthlyFeeAlreadyBilled: false,
    costMultiplier:          null,
    assignedAt:              d('2025-01-01T00:00:00.000Z'),
    periodStart:             d('2026-02-01T00:00:00.000Z'),
    periodEnd:               d('2026-02-28T23:59:59.999Z'),
    usageCost:               0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default auth for pay route tests
  mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1 — computeAgentBillingPeriod: additional edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeAgentBillingPeriod — additional edge cases', () => {

  it('Dec 31 assigned, now Jan 15 → period Dec 31 – Jan 30 (anchor day 31 in Jan clamps to 30)', () => {
    // endMonth = Jan(0+1=1=Feb? No: startMonth=Dec=11, endMonth=12 → endYear+1, endMonth%12=0=Jan
    // clamp(2026, 0=Jan, 31) → min(31, 31) = 31 → Date.UTC(2026,0,31) - 1ms = Jan 30 23:59:59.999
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2025-12-31T00:00:00.000Z'), d('2026-01-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2025-12-31T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-01-30T23:59:59.999Z'));
  });

  it('Dec 31 assigned, now Feb 5 → period Jan 31 – Feb 27 (Feb clamp)', () => {
    // startMonth = Jan(now.getUTCDate()=5 < anchorDay=31 → startMonth = 0-1 = -1 → Dec of prev year?
    // No wait: now = Feb 5. now.getUTCDate()=5 < anchorDay=31 → step back: startMonth = Feb(1)-1 = 0 = Jan
    // candidateStart = Jan 31. assignedAt = Dec 31. candidateStart(Jan31) > assignedAt(Dec31) → OK
    // endMonth = 0+1=1=Feb, clamp(2026,1,31) → Feb 2026 has 28 days → 28
    // periodEnd = Date.UTC(2026,1,28)-1 = Feb 27 23:59:59.999
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2025-12-31T00:00:00.000Z'), d('2026-02-05T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-31T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-02-27T23:59:59.999Z'));
  });

  it('Feb 28 assigned (2024 leap year), now Mar 5 2024 → period Feb 28 – Mar 27', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2024-02-28T00:00:00.000Z'), d('2024-03-05T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2024-02-28T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2024-03-27T23:59:59.999Z'));
  });

  it('same day assignment and query → period starts from assignedAt', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-01T00:00:00.000Z'), d('2026-01-01T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-01T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-01-31T23:59:59.999Z'));
  });

  it('period boundary: day BEFORE anniversary still belongs to current period', () => {
    const { periodStart } = computeAgentBillingPeriod(
      d('2026-03-15T00:00:00.000Z'), d('2026-04-14T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-03-15T00:00:00.000Z'));
  });

  it('period boundary: anniversary day itself rolls into the NEXT period', () => {
    const { periodStart } = computeAgentBillingPeriod(
      d('2026-03-15T00:00:00.000Z'), d('2026-04-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-04-15T00:00:00.000Z'));
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2 — isInvoiceOverdue: anniversary billing interaction
// ═══════════════════════════════════════════════════════════════════════════════

describe('isInvoiceOverdue — anniversary billing interaction', () => {

  /**
   * BUG EXPOSURE TEST
   *
   * For anniversary billing (e.g. assigned Feb 27, period Feb 27–Mar 26):
   *  - Invoice created on Feb 27 (periodStart = Feb 27)
   *  - isInvoiceOverdue uses: due = periodStart + 8 days = Mar 7
   *  - On Mar 7 the invoice becomes OVERDUE
   *  - BUT: periodEnd = Mar 26 > Mar 7 → Pay Now period-end gate is still DISABLED
   *  - Result: user sees OVERDUE invoice with Pay Now disabled for 19 more days
   *
   * Design note: isInvoiceOverdue was built for calendar-month billing
   * (periodStart = 1st of month → due = 9th of month). For anniversary billing
   * the "due" anchor should ideally be periodEnd + grace, not periodStart + grace.
   *
   * This test DOCUMENTS the current behaviour. A fix would change the due-date
   * logic for per-agent invoices to use periodEnd instead of periodStart.
   */
  it('BUG: DRAFT anniversary invoice becomes OVERDUE on day 8 from periodStart, BEFORE periodEnd', () => {
    const periodStart = d('2026-02-27T00:00:00.000Z'); // agent assigned Feb 27
    const periodEnd   = d('2026-03-26T23:59:59.999Z'); // period runs until Mar 26
    const onDay8      = d('2026-03-07T00:00:00.000Z'); // periodStart + 8 days

    // Current behaviour: overdue on day 8 from periodStart
    const isOverdue = isInvoiceOverdue('DRAFT', periodStart, onDay8);
    expect(isOverdue).toBe(true);                        // invoice is now OVERDUE

    // But the period has NOT ended yet
    expect(onDay8 < periodEnd).toBe(true);               // period still running

    // The period-end gate check (from billing-page-client.tsx):
    const periodComplete = periodEnd <= onDay8;
    expect(periodComplete).toBe(false);                  // Pay Now is still DISABLED

    // Combined effect: OVERDUE status + Pay Now disabled = user is stuck
    // until Mar 26 passes, even though they're being shown OVERDUE since Mar 7.
  });

  it('DRAFT anniversary invoice is NOT overdue within first 7 days', () => {
    const periodStart = d('2026-02-27T00:00:00.000Z');
    const day7        = d('2026-03-06T00:00:00.000Z');
    expect(isInvoiceOverdue('DRAFT', periodStart, day7)).toBe(false);
  });

  it('DRAFT calendar-month invoice correctly goes OVERDUE on day 8', () => {
    const periodStart = d('2026-03-01T00:00:00.000Z');
    const day8        = d('2026-03-09T00:00:00.000Z');
    expect(isInvoiceOverdue('DRAFT', periodStart, day8)).toBe(true);
  });

  it('PENDING invoice also transitions to OVERDUE after 8 days', () => {
    const periodStart = d('2026-03-01T00:00:00.000Z');
    const day9        = d('2026-03-09T00:00:00.000Z');
    expect(isInvoiceOverdue('PENDING', periodStart, day9)).toBe(true);
  });

  it('PAID invoice is never overdue', () => {
    const periodStart = d('2026-03-01T00:00:00.000Z');
    const day30       = d('2026-03-30T00:00:00.000Z');
    expect(isInvoiceOverdue('PAID', periodStart, day30)).toBe(false);
  });

  it('already-OVERDUE invoice does not double-transition', () => {
    const periodStart = d('2026-03-01T00:00:00.000Z');
    const day30       = d('2026-03-30T00:00:00.000Z');
    expect(isInvoiceOverdue('OVERDUE', periodStart, day30)).toBe(false);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3 — buildLineItems: edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildLineItems — edge cases', () => {

  it('setupFee = 0 is treated as falsy and excluded', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = buildLineItems([makeAgent({ setupFee: 0 as any })]);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeUndefined();
  });

  it('monthlyFee = 0 is treated as falsy and excluded', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = buildLineItems([makeAgent({ monthlyFee: 0 as any })]);
    expect(items.find(i => i.type === 'MONTHLY_FEE')).toBeUndefined();
  });

  it('very large usage fee is rounded to 2dp correctly', () => {
    // 1234.5678 × 2.5 = 3086.4195 → 3086.42
    const items = buildLineItems([makeAgent({ costMultiplier: 2.5, usageCost: 1234.5678 })]);
    expect(items.find(i => i.type === 'USAGE_FEE')?.total).toBe(3086.42);
  });

  it('multiple agents produce independent line items with correct per-agent totals', () => {
    const agentA = makeAgent({ retellAgentId: 'agt-A', agentName: 'Alpha', setupFee: 100, monthlyFee: 50 });
    const agentB = makeAgent({ retellAgentId: 'agt-B', agentName: 'Beta',  setupFee: 200, monthlyFee: 75 });
    const items = buildLineItems([agentA, agentB]);

    expect(items.filter(i => i.type === 'SETUP_FEE')).toHaveLength(2);
    expect(items.filter(i => i.type === 'MONTHLY_FEE')).toHaveLength(2);
    expect(items.find(i => i.agentId === 'agt-A' && i.type === 'SETUP_FEE')?.total).toBe(100);
    expect(items.find(i => i.agentId === 'agt-B' && i.type === 'SETUP_FEE')?.total).toBe(200);
  });

  it('empty agents list returns empty array without throwing', () => {
    expect(buildLineItems([])).toEqual([]);
    expect(computeSubtotal([])).toBe(0);
  });

  it('all three fee types produce correct combined subtotal', () => {
    // 500 + 200 + (0.2 × 1.5 = 0.30) = 700.30
    const items = buildLineItems([makeAgent({ setupFee: 500, monthlyFee: 200, costMultiplier: 1.5, usageCost: 0.2 })]);
    expect(items).toHaveLength(3);
    expect(computeSubtotal(items)).toBe(700.30);
  });

  it('USAGE_FEE: quantity = raw Retell cost, unitPrice = multiplier', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: 3.0, usageCost: 0.05 })]);
    const fee = items.find(i => i.type === 'USAGE_FEE')!;
    expect(fee.quantity).toBe(0.05);
    expect(fee.unitPrice).toBe(3.0);
    expect(fee.total).toBe(0.15);
  });

  it('USAGE_FEE description contains agent name but not raw numbers', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: 2.0, usageCost: 0.042167, agentName: 'My Bot' })]);
    const fee = items.find(i => i.type === 'USAGE_FEE')!;
    expect(fee.description).toContain('My Bot');
    expect(fee.description).not.toContain('0.042167');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4 — getOldestOverdueInvoice: additional scenarios
// ═══════════════════════════════════════════════════════════════════════════════

describe('getOldestOverdueInvoice — additional scenarios', () => {

  it('handles OVERDUE mixed with non-OVERDUE spanning many months', () => {
    const invoices = [
      { id: 'inv_a', status: 'PAID',    periodStart: '2025-01-01' },
      { id: 'inv_b', status: 'OVERDUE', periodStart: '2025-06-01' },
      { id: 'inv_c', status: 'PAID',    periodStart: '2025-07-01' },
      { id: 'inv_d', status: 'OVERDUE', periodStart: '2025-12-01' },
      { id: 'inv_e', status: 'DRAFT',   periodStart: '2026-01-01' },
    ];
    expect(getOldestOverdueInvoice(invoices)?.id).toBe('inv_b');
  });

  it('returns null when all invoices are PAID or DRAFT', () => {
    const invoices = [
      { id: 'inv_1', status: 'PAID',  periodStart: '2026-01-01' },
      { id: 'inv_2', status: 'DRAFT', periodStart: '2026-02-01' },
    ];
    expect(getOldestOverdueInvoice(invoices)).toBeNull();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5 — resolveInvoicePayability: comprehensive status matrix
// ═══════════════════════════════════════════════════════════════════════════════

describe('resolveInvoicePayability — full status × blocker matrix', () => {

  it('DRAFT + no blocker → canPay: true, no message', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'DRAFT' }, null))
      .toEqual({ canPay: true, blockMessage: null });
  });

  it('DRAFT + self is blocker → canPay: true (this IS the invoice to pay)', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'DRAFT' }, { id: 'i1' }).canPay).toBe(true);
  });

  it('DRAFT + different blocker → canPay: false with message', () => {
    const result = resolveInvoicePayability({ id: 'i1', status: 'DRAFT' }, { id: 'i_old' });
    expect(result.canPay).toBe(false);
    expect(result.blockMessage).toMatch(/overdue/i);
  });

  it('OVERDUE + self is blocker → canPay: true', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'OVERDUE' }, { id: 'i1' }).canPay).toBe(true);
  });

  it('OVERDUE + different blocker → canPay: false', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'OVERDUE' }, { id: 'i_older' }).canPay).toBe(false);
  });

  it('PENDING → always canPay: false, blockMessage: null (payment in-flight)', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'PENDING' }, null))
      .toEqual({ canPay: false, blockMessage: null });
  });

  it('PENDING + blocker → canPay: false, blockMessage: null (PENDING wins, not "pay overdue first")', () => {
    const result = resolveInvoicePayability({ id: 'i1', status: 'PENDING' }, { id: 'i_old' });
    expect(result.canPay).toBe(false);
    expect(result.blockMessage).toBeNull(); // NOT the overdue message — PENDING handled first
  });

  it('PAID → canPay: false', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'PAID' }, null).canPay).toBe(false);
  });

  it('CANCELLED → canPay: false', () => {
    expect(resolveInvoicePayability({ id: 'i1', status: 'CANCELLED' }, null).canPay).toBe(false);
  });

  it('overdue blocker enforces pay-first ordering across two agents', () => {
    const invoices = [
      { id: 'inv_old', status: 'OVERDUE', periodStart: '2026-01-01' },
      { id: 'inv_new', status: 'DRAFT',   periodStart: '2026-02-27' },
    ];
    const blocker = getOldestOverdueInvoice(invoices);
    expect(blocker?.id).toBe('inv_old');

    // The overdue invoice itself is payable
    expect(resolveInvoicePayability({ id: 'inv_old', status: 'OVERDUE' }, blocker).canPay).toBe(true);
    // The newer DRAFT is blocked until the overdue is paid
    expect(resolveInvoicePayability({ id: 'inv_new', status: 'DRAFT' }, blocker).canPay).toBe(false);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6 — autoMarkOverdueForUser (Prisma mocked)
// ═══════════════════════════════════════════════════════════════════════════════

describe('autoMarkOverdueForUser', () => {

  it('does nothing when there are no DRAFT/PENDING invoices', async () => {
    mockInvoiceFindMany.mockResolvedValue([]);
    await autoMarkOverdueForUser('user_1');
    expect(mockInvoiceUpdateMany).not.toHaveBeenCalled();
  });

  it('marks DRAFT invoice OVERDUE when past 8-day grace period', async () => {
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 10);

    mockInvoiceFindMany.mockResolvedValue([
      { id: 'inv_1', status: 'DRAFT', periodStart: pastDue },
    ]);
    mockInvoiceUpdateMany.mockResolvedValue({ count: 1 });

    await autoMarkOverdueForUser('user_1');

    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['inv_1'] } },
        data:  { status: 'OVERDUE' },
      })
    );
  });

  it('marks PENDING invoice OVERDUE when past 8-day grace period', async () => {
    const pastDue = new Date();
    pastDue.setDate(pastDue.getDate() - 10);

    mockInvoiceFindMany.mockResolvedValue([
      { id: 'inv_2', status: 'PENDING', periodStart: pastDue },
    ]);
    mockInvoiceUpdateMany.mockResolvedValue({ count: 1 });

    await autoMarkOverdueForUser('user_1');

    expect(mockInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['inv_2'] } },
        data:  { status: 'OVERDUE' },
      })
    );
  });

  it('does NOT mark invoice OVERDUE when within 8-day grace period', async () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);

    mockInvoiceFindMany.mockResolvedValue([
      { id: 'inv_3', status: 'DRAFT', periodStart: recent },
    ]);

    await autoMarkOverdueForUser('user_1');
    expect(mockInvoiceUpdateMany).not.toHaveBeenCalled();
  });

  it('selectively marks only the overdue invoice from a mixed set', async () => {
    const pastDue = new Date(); pastDue.setDate(pastDue.getDate() - 10);
    const recent  = new Date(); recent.setDate(recent.getDate() - 2);

    mockInvoiceFindMany.mockResolvedValue([
      { id: 'inv_old', status: 'DRAFT',   periodStart: pastDue },
      { id: 'inv_new', status: 'PENDING', periodStart: recent },
    ]);
    mockInvoiceUpdateMany.mockResolvedValue({ count: 1 });

    await autoMarkOverdueForUser('user_1');

    const callArg = mockInvoiceUpdateMany.mock.calls[0][0];
    expect(callArg.where.id.in).toContain('inv_old');
    expect(callArg.where.id.in).not.toContain('inv_new');
  });

  it('queries only DRAFT and PENDING statuses (avoids touching PAID/OVERDUE)', async () => {
    mockInvoiceFindMany.mockResolvedValue([]);
    await autoMarkOverdueForUser('user_1');

    expect(mockInvoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['DRAFT', 'PENDING'] } }),
      })
    );
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7 — createSetupFeeInvoiceForAgent (Prisma mocked)
// ═══════════════════════════════════════════════════════════════════════════════

describe('createSetupFeeInvoiceForAgent', () => {

  const baseUA = {
    id: 'ua_1', userId: 'user_1', setupFee: 500, setupFeePaid: false,
    assignedAt: new Date('2026-03-01T00:00:00.000Z'),
    agent: { retellAgentId: 'retell_1', name: 'Test Agent' },
  };

  it('does nothing when UserAgent does not exist', async () => {
    mockUserAgentFindUnique.mockResolvedValue(null);
    await createSetupFeeInvoiceForAgent('ua_missing');
    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('does nothing when setupFee is null', async () => {
    mockUserAgentFindUnique.mockResolvedValue({ ...baseUA, setupFee: null });
    await createSetupFeeInvoiceForAgent('ua_1');
    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('does nothing when a non-cancelled SETUP invoice already exists (idempotent)', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_existing', status: 'DRAFT' });

    await createSetupFeeInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('creates SETUP invoice + SETUP_FEE line item when none exists', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue(null);         // no existing SETUP invoice
    mockInvoiceFindMany.mockResolvedValue([]);            // no taken invoice numbers
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_new' });
    mockTxLineItemCreate.mockResolvedValue({});

    await createSetupFeeInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).toHaveBeenCalledTimes(1);
    const invoiceData = mockTxInvoiceCreate.mock.calls[0][0].data;
    expect(invoiceData.invoiceType).toBe('SETUP');
    expect(invoiceData.userId).toBe('user_1');
    expect(invoiceData.userAgentId).toBe('ua_1');
    expect(invoiceData.status).toBe('DRAFT');
    expect(Number(invoiceData.subtotal)).toBe(500);
    expect(Number(invoiceData.total)).toBe(500);
  });

  it('creates the SETUP_FEE line item with correct values', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue(null);
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_new' });
    mockTxLineItemCreate.mockResolvedValue({});

    await createSetupFeeInvoiceForAgent('ua_1');

    expect(mockTxLineItemCreate).toHaveBeenCalledTimes(1);
    const lineData = mockTxLineItemCreate.mock.calls[0][0].data;
    expect(lineData.type).toBe('SETUP_FEE');
    expect(Number(lineData.total)).toBe(500);
    expect(lineData.agentName).toBe('Test Agent');
    expect(lineData.invoiceId).toBe('inv_new');
  });

  it('invoice number includes INV-SETUP prefix', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue(null);
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_new' });
    mockTxLineItemCreate.mockResolvedValue({});

    await createSetupFeeInvoiceForAgent('ua_1');

    const invoiceNumber = mockTxInvoiceCreate.mock.calls[0][0].data.invoiceNumber as string;
    expect(invoiceNumber.startsWith('INV-SETUP-')).toBe(true);
    // Format: INV-SETUP-YYYYMM-USERID6-UAID6
    expect(invoiceNumber).toMatch(/^INV-SETUP-\d{6}-\w+-\w+/);
  });

  it('idempotent: 2nd call with existing DRAFT invoice does not create a duplicate', async () => {
    // Call 1: no existing invoice → creates
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValueOnce(null);
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_setup' });
    mockTxLineItemCreate.mockResolvedValue({});
    await createSetupFeeInvoiceForAgent('ua_1');
    expect(mockTxInvoiceCreate).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    // Call 2: DRAFT now exists → skips
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_setup', status: 'DRAFT' });
    await createSetupFeeInvoiceForAgent('ua_1');
    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 8 — ensureMonthlyInvoiceForAgent (Prisma mocked)
// ═══════════════════════════════════════════════════════════════════════════════

describe('ensureMonthlyInvoiceForAgent', () => {

  const baseUA = {
    id: 'ua_1', userId: 'user_1',
    setupFee: null, setupFeePaid: true,
    monthlyFee: 200, costMultiplier: null,
    assignedAt: new Date('2026-02-27T00:00:00.000Z'),
    agent: { retellAgentId: 'retell_1', name: 'Test Agent' },
  };

  it('does nothing when UserAgent does not exist', async () => {
    mockUserAgentFindUnique.mockResolvedValue(null);
    await ensureMonthlyInvoiceForAgent('ua_missing');
    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('creates a MONTHLY DRAFT invoice when none exists for the current period', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue(null);    // no existing monthly invoice
    mockInvoiceFindMany.mockResolvedValue([]);       // no taken numbers
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_new' });
    mockTxLineItemCreateMany.mockResolvedValue({ count: 1 });

    await ensureMonthlyInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).toHaveBeenCalledTimes(1);
    const data = mockTxInvoiceCreate.mock.calls[0][0].data;
    expect(data.invoiceType).toBe('MONTHLY');
    expect(data.userId).toBe('user_1');
    expect(data.userAgentId).toBe('ua_1');
    expect(data.status).toBe('DRAFT');
    expect(Number(data.total)).toBe(200);
  });

  it('noops when a PENDING invoice exists for the current period', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_pending', status: 'PENDING' });

    await ensureMonthlyInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
    expect(mockTxLineItemDeleteMany).not.toHaveBeenCalled();
  });

  it('noops when a PAID invoice exists for the current period', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_paid', status: 'PAID' });

    await ensureMonthlyInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('noops when an OVERDUE invoice exists for the current period', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_overdue', status: 'OVERDUE' });

    await ensureMonthlyInvoiceForAgent('ua_1');

    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

  it('recalculates (deletes old line items, creates new ones) when a DRAFT exists', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv_draft', status: 'DRAFT' });
    mockTxLineItemDeleteMany.mockResolvedValue({ count: 1 });
    mockTxLineItemCreateMany.mockResolvedValue({ count: 1 });
    mockTxInvoiceUpdate.mockResolvedValue({});

    await ensureMonthlyInvoiceForAgent('ua_1');

    // Deletes old line items for this invoice
    expect(mockTxLineItemDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { invoiceId: 'inv_draft' } })
    );
    // Does NOT create a new invoice
    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
    // Updates the existing invoice total
    expect(mockTxInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv_draft' } })
    );
  });

  it('includes usage fee in total when costMultiplier is set', async () => {
    const uaWithUsage = { ...baseUA, costMultiplier: 1.5 };
    mockUserAgentFindUnique.mockResolvedValue(uaWithUsage);
    mockInvoiceFindFirst.mockResolvedValue(null);
    mockCallAggregate.mockResolvedValue({ _sum: { totalCost: '0.4' } }); // $0.40 Retell cost
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_new' });
    mockTxLineItemCreateMany.mockResolvedValue({ count: 2 });

    await ensureMonthlyInvoiceForAgent('ua_1');

    // 200 (monthly) + 0.4×1.5=0.60 (usage) = 200.60
    const total = Number(mockTxInvoiceCreate.mock.calls[0][0].data.total);
    expect(total).toBeCloseTo(200.60, 2);
  });

  it('does NOT include SETUP_FEE on MONTHLY invoice (setup has its own invoice)', async () => {
    const uaWithSetup = { ...baseUA, setupFee: 500 };
    mockUserAgentFindUnique.mockResolvedValue(uaWithSetup);
    mockInvoiceFindFirst.mockResolvedValue(null);
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_monthly' });
    mockTxLineItemCreateMany.mockResolvedValue({ count: 1 });

    await ensureMonthlyInvoiceForAgent('ua_1');

    const lineItems = mockTxLineItemCreateMany.mock.calls[0][0].data as Array<{ type: string }>;
    expect(lineItems.every(li => li.type !== 'SETUP_FEE')).toBe(true);
    expect(lineItems.some(li => li.type === 'MONTHLY_FEE')).toBe(true);
  });

  it('invoice number does NOT include SETUP prefix (monthly format)', async () => {
    mockUserAgentFindUnique.mockResolvedValue(baseUA);
    mockInvoiceFindFirst.mockResolvedValue(null);
    mockInvoiceFindMany.mockResolvedValue([]);
    mockTxInvoiceCreate.mockResolvedValue({ id: 'inv_monthly' });
    mockTxLineItemCreateMany.mockResolvedValue({ count: 1 });

    await ensureMonthlyInvoiceForAgent('ua_1');

    const invoiceNumber = mockTxInvoiceCreate.mock.calls[0][0].data.invoiceNumber as string;
    expect(invoiceNumber).toMatch(/^INV-\d{6}-/);   // starts with INV-YYYYMM-
    expect(invoiceNumber).not.toContain('SETUP');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 9 — ensureBillingUpToDateForUser
// ═══════════════════════════════════════════════════════════════════════════════

describe('ensureBillingUpToDateForUser', () => {

  it('is exported and callable', () => {
    expect(typeof ensureBillingUpToDateForUser).toBe('function');
  });

  it('fetches all of the user\'s agents and processes each one', async () => {
    mockUserAgentFindMany.mockResolvedValue([{ id: 'ua_1' }, { id: 'ua_2' }]);
    mockUserAgentFindUnique.mockResolvedValue(null); // early exit per agent
    mockInvoiceFindMany.mockResolvedValue([]);       // autoMarkOverdue: no candidates

    await ensureBillingUpToDateForUser('user_1');

    expect(mockUserAgentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' } })
    );
  });

  it('does nothing when user has no agents', async () => {
    mockUserAgentFindMany.mockResolvedValue([]);
    mockInvoiceFindMany.mockResolvedValue([]);

    await ensureBillingUpToDateForUser('user_1');

    expect(mockTxInvoiceCreate).not.toHaveBeenCalled();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 10 — Pay route: additional coverage
// ═══════════════════════════════════════════════════════════════════════════════

function makePayRequest() {
  return new Request('http://localhost/api/billing/invoices/inv_1/pay', { method: 'POST' });
}
function makePayParams(id = 'inv_1') {
  return { params: Promise.resolve({ invoiceId: id }) };
}

describe('POST /api/billing/invoices/[invoiceId]/pay — additional coverage', () => {

  it('returns 422 when invoice is PENDING (Stripe checkout already in-flight)', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'PENDING', total: 100,
      lineItems: [{ id: 'li_1', description: 'Monthly', total: 100 }],
    });

    const res = await payPOST(makePayRequest(), makePayParams());
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.error).toMatch(/cannot be paid/i);
    expect(mockStripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it('line items are mapped to AUD cents for Stripe (unit_amount = Math.round(total × 100))', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 200.04,
      lineItems: [
        { id: 'li_1', description: 'Monthly Fee', total: 200    },
        { id: 'li_2', description: 'Usage Fee',   total: 0.04  },
      ],
    });
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_test' });
    mockStripeCheckoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com/pay/cs_1' });
    mockInvoiceUpdate.mockResolvedValue({});

    await payPOST(makePayRequest(), makePayParams());

    const sessionArg = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(20000); // $200.00 = 20000 cents
    expect(sessionArg.line_items[1].price_data.unit_amount).toBe(4);     // $0.04 = 4 cents
    expect(sessionArg.line_items[0].price_data.currency).toBe('aud');
  });

  it('metadata contains invoiceId so the webhook can find the invoice', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      id: 'inv_specific', status: 'DRAFT', total: 50,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 50 }],
    });
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_test' });
    mockStripeCheckoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com/pay/cs_1' });
    mockInvoiceUpdate.mockResolvedValue({});

    await payPOST(makePayRequest(), makePayParams('inv_specific'));

    const sessionArg = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(sessionArg.metadata).toEqual({ invoiceId: 'inv_specific' });
  });

  it('success_url and cancel_url contain the correct query parameters', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 50,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 50 }],
    });
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_test' });
    mockStripeCheckoutCreate.mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com/cs_1' });
    mockInvoiceUpdate.mockResolvedValue({});

    await payPOST(makePayRequest(), makePayParams());

    const sessionArg = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(sessionArg.success_url).toContain('payment=success');
    expect(sessionArg.cancel_url).toContain('payment=cancelled');
  });

  it('invoice.status is set to PENDING after checkout session is created', async () => {
    mockInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_test' });
    mockStripeCheckoutCreate.mockResolvedValue({ id: 'cs_new', url: 'https://stripe.com/cs_new' });
    mockInvoiceUpdate.mockResolvedValue({});

    await payPOST(makePayRequest(), makePayParams());

    expect(mockInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          stripeCheckoutSessionId: 'cs_new',
        }),
      })
    );
  });

});
