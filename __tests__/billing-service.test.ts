import {
  resolveInvoiceAction,
  buildInvoiceNumber,
  resolveGetBillButton,
  buildAgentInvoiceNumber,
  type SlimInvoice,
} from '../lib/billing-service';

// ── resolveInvoiceAction ───────────────────────────────────────────────────────
// This pure function decides what to do for a billing period.
// create      → no active invoice exists, generate a fresh one
// recalculate → a DRAFT exists, refresh its USAGE_FEE and totals
// noop        → invoice is finalized (PENDING/PAID/OVERDUE), leave it alone

describe('resolveInvoiceAction', () => {
  it('creates when no invoice exists', () => {
    expect(resolveInvoiceAction(null)).toEqual({ type: 'create' });
  });

  it('creates when the only invoice is CANCELLED', () => {
    const cancelled: SlimInvoice = { id: 'inv_1', status: 'CANCELLED' };
    expect(resolveInvoiceAction(cancelled)).toEqual({ type: 'create' });
  });

  it('recalculates when a DRAFT invoice exists', () => {
    const draft: SlimInvoice = { id: 'inv_2', status: 'DRAFT' };
    expect(resolveInvoiceAction(draft)).toEqual({ type: 'recalculate', invoiceId: 'inv_2' });
  });

  // Regression: user generates bill, makes new calls, clicks "Get Bill" again.
  // The DRAFT must be recalculated — not skipped — so the new usage cost is picked up.
  it('recalculates (not noops) when DRAFT exists and user requests an update after new calls', () => {
    const draftAfterNewCalls: SlimInvoice = { id: 'inv_draft', status: 'DRAFT' };
    const action = resolveInvoiceAction(draftAfterNewCalls);
    expect(action.type).toBe('recalculate');
    expect(action).toEqual({ type: 'recalculate', invoiceId: 'inv_draft' });
  });

  it('noops when invoice is PENDING (already sent to user)', () => {
    const pending: SlimInvoice = { id: 'inv_3', status: 'PENDING' };
    expect(resolveInvoiceAction(pending)).toEqual({ type: 'noop', invoiceId: 'inv_3' });
  });

  it('noops when invoice is PAID', () => {
    const paid: SlimInvoice = { id: 'inv_4', status: 'PAID' };
    expect(resolveInvoiceAction(paid)).toEqual({ type: 'noop', invoiceId: 'inv_4' });
  });

  it('noops when invoice is OVERDUE', () => {
    const overdue: SlimInvoice = { id: 'inv_5', status: 'OVERDUE' };
    expect(resolveInvoiceAction(overdue)).toEqual({ type: 'noop', invoiceId: 'inv_5' });
  });
});

// ── buildInvoiceNumber ─────────────────────────────────────────────────────────
// Generates a unique invoice number, handling collisions from cancelled invoices.

describe('buildInvoiceNumber', () => {
  const userId  = 'clxabc123456';   // cuid-style
  const year    = 2026;
  const month   = 2; // February (1-based)

  it('returns base number when nothing is taken', () => {
    const result = buildInvoiceNumber(userId, year, month, new Set());
    expect(result).toBe('INV-202602-CLXABC');
  });

  it('uppercases the first 6 chars of userId', () => {
    const result = buildInvoiceNumber('abcdef999', year, month, new Set());
    expect(result).toBe('INV-202602-ABCDEF');
  });

  it('appends -2 when base is already taken', () => {
    const taken = new Set(['INV-202602-CLXABC']);
    expect(buildInvoiceNumber(userId, year, month, taken)).toBe('INV-202602-CLXABC-2');
  });

  it('increments suffix until a free slot is found', () => {
    const taken = new Set(['INV-202602-CLXABC', 'INV-202602-CLXABC-2', 'INV-202602-CLXABC-3']);
    expect(buildInvoiceNumber(userId, year, month, taken)).toBe('INV-202602-CLXABC-4');
  });

  it('zero-pads single-digit months', () => {
    const result = buildInvoiceNumber(userId, 2026, 3, new Set());
    expect(result).toBe('INV-202603-CLXABC');
  });
});

// ── resolveGetBillButton ───────────────────────────────────────────────────────
// Determines label + disabled state for the persistent "Get Bill" header button.

describe('resolveGetBillButton', () => {
  it('returns enabled "Get Bill" when no invoice exists', () => {
    expect(resolveGetBillButton(null)).toEqual({ label: 'Get Bill', disabled: false });
  });
  it('returns enabled "Update Bill" when invoice is DRAFT', () => {
    expect(resolveGetBillButton('DRAFT')).toEqual({ label: 'Update Bill', disabled: false });
  });
  it('returns disabled when invoice is PENDING', () => {
    expect(resolveGetBillButton('PENDING')).toEqual({ label: 'Get Bill', disabled: true });
  });
  it('returns enabled "Get Bill" when invoice is PAID (allow supplement invoice for remaining calls)', () => {
    expect(resolveGetBillButton('PAID')).toEqual({ label: 'Get Bill', disabled: false });
  });
  it('returns disabled when invoice is OVERDUE', () => {
    expect(resolveGetBillButton('OVERDUE')).toEqual({ label: 'Get Bill', disabled: true });
  });
  it('returns enabled "Get Bill" when invoice is CANCELLED', () => {
    expect(resolveGetBillButton('CANCELLED')).toEqual({ label: 'Get Bill', disabled: false });
  });
});

// ── ensureBillingUpToDate ──────────────────────────────────────────────────────

describe('ensureBillingUpToDate', () => {
  it('is exported from billing-service', () => {
    const { ensureBillingUpToDate } = require('@/lib/billing-service');
    expect(typeof ensureBillingUpToDate).toBe('function');
  });
});

// ── buildAgentInvoiceNumber ───────────────────────────────────────────────────

describe('buildAgentInvoiceNumber', () => {
  const userId      = 'clxabc123456';
  const userAgentId = 'ua1234567890';
  const year        = 2026;
  const month       = 3; // March

  it('generates MONTHLY format: INV-YYYYMM-USERID6-UAGENTID6', () => {
    const result = buildAgentInvoiceNumber(userId, userAgentId, year, month, 'MONTHLY', new Set());
    expect(result).toBe('INV-202603-CLXABC-UA1234');
  });

  it('generates SETUP format: INV-SETUP-YYYYMM-USERID6-UAGENTID6', () => {
    const result = buildAgentInvoiceNumber(userId, userAgentId, year, month, 'SETUP', new Set());
    expect(result).toBe('INV-SETUP-202603-CLXABC-UA1234');
  });

  it('appends -2 on collision, increments until free', () => {
    const taken = new Set(['INV-202603-CLXABC-UA1234', 'INV-202603-CLXABC-UA1234-2']);
    const result = buildAgentInvoiceNumber(userId, userAgentId, year, month, 'MONTHLY', taken);
    expect(result).toBe('INV-202603-CLXABC-UA1234-3');
  });

  it('zero-pads single-digit months', () => {
    const result = buildAgentInvoiceNumber(userId, userAgentId, 2026, 3, 'MONTHLY', new Set());
    expect(result).toBe('INV-202603-CLXABC-UA1234');
  });
});

// ── createSetupFeeInvoiceForAgent — export check ──────────────────────────────

describe('createSetupFeeInvoiceForAgent', () => {
  it('is exported', () => {
    const { createSetupFeeInvoiceForAgent } = require('@/lib/billing-service');
    expect(typeof createSetupFeeInvoiceForAgent).toBe('function');
  });
});

// ── ensureMonthlyInvoiceForAgent — export check ───────────────────────────────

describe('ensureMonthlyInvoiceForAgent', () => {
  it('is exported', () => {
    const { ensureMonthlyInvoiceForAgent } = require('@/lib/billing-service');
    expect(typeof ensureMonthlyInvoiceForAgent).toBe('function');
  });
});

// ── ensureBillingUpToDateForUser — export check ───────────────────────────────

describe('ensureBillingUpToDateForUser', () => {
  it('is exported', () => {
    const { ensureBillingUpToDateForUser } = require('@/lib/billing-service');
    expect(typeof ensureBillingUpToDateForUser).toBe('function');
  });
});
