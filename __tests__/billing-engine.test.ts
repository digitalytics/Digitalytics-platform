import { buildLineItems, computeSubtotal, generateInvoiceNumber, isInvoiceOverdue, computeAgentBillingPeriod, AgentInput } from '../lib/billing-engine';

const PERIOD_START = new Date('2026-02-01T00:00:00.000Z');
const PERIOD_END   = new Date('2026-02-28T23:59:59.999Z');
const ASSIGNED_BEFORE_PERIOD = new Date('2025-01-01T00:00:00.000Z');

function makeAgent(overrides: Partial<AgentInput> = {}): AgentInput {
  return {
    retellAgentId:          'agent-001',
    agentName:              'Test Agent',
    setupFee:               null,
    setupFeeAlreadyBilled:  false,
    monthlyFee:             null,
    monthlyFeeAlreadyBilled: false,
    costMultiplier:         null,
    assignedAt:             ASSIGNED_BEFORE_PERIOD,
    periodStart:            PERIOD_START,
    periodEnd:              PERIOD_END,
    usageCost:              0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildLineItems — SETUP_FEE
// ---------------------------------------------------------------------------
describe('buildLineItems — SETUP_FEE', () => {
  it('includes SETUP_FEE when not already billed', () => {
    const items = buildLineItems([makeAgent({ setupFee: 500, setupFeeAlreadyBilled: false })]);
    expect(items.find(i => i.type === 'SETUP_FEE')).toMatchObject({ total: 500 });
  });

  it('excludes SETUP_FEE when already billed on a prior invoice', () => {
    const items = buildLineItems([makeAgent({ setupFee: 500, setupFeeAlreadyBilled: true })]);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeUndefined();
  });

  it('excludes SETUP_FEE when setupFee is null', () => {
    const items = buildLineItems([makeAgent({ setupFee: null, setupFeeAlreadyBilled: false })]);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeUndefined();
  });

  /**
   * KEY REGRESSION TEST — 2nd Generate clears setup fee total.
   *
   * When recalculating a DRAFT invoice, the `alreadyBilled` check must
   * exclude the current invoice being updated. If it incorrectly sees
   * the setup fee on the current invoice and returns true, the subtotal
   * will be computed without the setup fee.
   *
   * The route passes `setupFeeAlreadyBilled: false` when the only non-cancelled
   * invoice that has a SETUP_FEE line item IS the current draft being updated
   * (i.e. it is excluded from the query). buildLineItems should therefore
   * include SETUP_FEE — it is not a double-charge because the old line item
   * is retained on the invoice and NOT re-created.
   */
  it('includes SETUP_FEE (setupFeeAlreadyBilled=false) when the only billing is on the current draft being updated', () => {
    // Simulates: existing DRAFT has setup fee, we're recalculating it.
    // Route excludes current invoice from alreadyBilled check → false.
    const items = buildLineItems([makeAgent({ setupFee: 500, setupFeeAlreadyBilled: false })]);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// buildLineItems — MONTHLY_FEE
// ---------------------------------------------------------------------------
describe('buildLineItems — MONTHLY_FEE', () => {
  it('includes MONTHLY_FEE when not already billed', () => {
    const items = buildLineItems([makeAgent({ monthlyFee: 200, monthlyFeeAlreadyBilled: false })]);
    expect(items.find(i => i.type === 'MONTHLY_FEE')).toMatchObject({ total: 200 });
  });

  it('excludes MONTHLY_FEE when monthlyFee is null', () => {
    const items = buildLineItems([makeAgent({ monthlyFee: null })]);
    expect(items.find(i => i.type === 'MONTHLY_FEE')).toBeUndefined();
  });

  it('excludes MONTHLY_FEE when already billed on a PAID invoice for the same period (supplement invoice)', () => {
    const items = buildLineItems([makeAgent({ monthlyFee: 200, monthlyFeeAlreadyBilled: true })]);
    expect(items.find(i => i.type === 'MONTHLY_FEE')).toBeUndefined();
  });

  it('supplement invoice contains only USAGE_FEE when monthly fee was already paid', () => {
    const items = buildLineItems([makeAgent({
      monthlyFee:             200,
      monthlyFeeAlreadyBilled: true,
      costMultiplier:         1.5,
      usageCost:              0.1,   // 0.1 × 1.5 = 0.15
    })]);
    expect(items.find(i => i.type === 'MONTHLY_FEE')).toBeUndefined();
    expect(items.find(i => i.type === 'USAGE_FEE')).toBeDefined();
    expect(items.find(i => i.type === 'USAGE_FEE')?.total).toBeCloseTo(0.15, 2);
  });
});

// ---------------------------------------------------------------------------
// buildLineItems — USAGE_FEE
// ---------------------------------------------------------------------------
describe('buildLineItems — USAGE_FEE', () => {
  it('includes USAGE_FEE when usageCost > 0', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: 1.5, usageCost: 0.013417 })]);
    const fee = items.find(i => i.type === 'USAGE_FEE');
    expect(fee).toBeDefined();
    expect(fee?.quantity).toBeCloseTo(0.013417, 6);   // quantity = Retell cost
    expect(fee?.unitPrice).toBe(1.5);                 // unitPrice = multiplier
    expect(fee?.total).toBeCloseTo(0.02, 2);          // 0.013417 × 1.5 = 0.020126 ≈ 0.02
  });

  it('excludes USAGE_FEE when usageCost is 0', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: 1.5, usageCost: 0 })]);
    expect(items.find(i => i.type === 'USAGE_FEE')).toBeUndefined();
  });

  it('excludes USAGE_FEE when costMultiplier is null', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: null, usageCost: 0.05 })]);
    expect(items.find(i => i.type === 'USAGE_FEE')).toBeUndefined();
  });

  it('description includes agent name but not raw cost or multiplier', () => {
    const items = buildLineItems([makeAgent({ costMultiplier: 2.0, usageCost: 0.042167 })]);
    const fee = items.find(i => i.type === 'USAGE_FEE');
    expect(fee?.description).toContain('Test Agent');
    expect(fee?.description).not.toContain('0.042167');
    expect(fee?.description).not.toContain('2×');
  });
});

// ---------------------------------------------------------------------------
// computeSubtotal
// ---------------------------------------------------------------------------
describe('computeSubtotal', () => {
  it('sums all item totals to 2dp', () => {
    const items = buildLineItems([
      makeAgent({
        setupFee:       500,
        monthlyFee:     200,
        costMultiplier: 1.5,
        usageCost:      0.2,
      }),
    ]);
    // 500 + 200 + 0.30 = 700.30
    expect(computeSubtotal(items)).toBe(700.30);
  });

  it('returns 0 for empty list', () => {
    expect(computeSubtotal([])).toBe(0);
  });

  it('handles floating-point correctly', () => {
    // 0.1 + 0.2 in raw JS = 0.30000000000000004 — must round to 0.30
    const items = buildLineItems([makeAgent({ costMultiplier: 2.0, usageCost: 0.1 })]); // 0.1 * 2.0 = 0.2
    expect(computeSubtotal(items)).toBe(0.20);
  });
});

// ---------------------------------------------------------------------------
// generateInvoiceNumber — collision handling
// ---------------------------------------------------------------------------
describe('generateInvoiceNumber', () => {
  it('returns base number when not taken', () => {
    expect(generateInvoiceNumber('INV-202602-ABCDEF', new Set())).toBe('INV-202602-ABCDEF');
  });

  it('appends -2 when base is taken by a cancelled invoice', () => {
    expect(
      generateInvoiceNumber('INV-202602-ABCDEF', new Set(['INV-202602-ABCDEF']))
    ).toBe('INV-202602-ABCDEF-2');
  });

  it('increments suffix until a free slot is found', () => {
    const taken = new Set(['INV-202602-ABCDEF', 'INV-202602-ABCDEF-2', 'INV-202602-ABCDEF-3']);
    expect(generateInvoiceNumber('INV-202602-ABCDEF', taken)).toBe('INV-202602-ABCDEF-4');
  });
});

// ---------------------------------------------------------------------------
// Full scenario: 2nd Generate preserves setup fee in subtotal
// ---------------------------------------------------------------------------
describe('Full scenario — 2nd Generate preserves correct subtotal', () => {
  it('subtotal includes setup fee when setupFeeAlreadyBilled=false (DRAFT recalculate path)', () => {
    // Simulates: agent has setup fee $500, monthly $200, usage cost $0.20 @ 1.5× multiplier
    // On 2nd Generate, route sets setupFeeAlreadyBilled=false because it excludes
    // the current draft from the alreadyBilled lookup.
    const items = buildLineItems([
      makeAgent({
        setupFee:              500,
        setupFeeAlreadyBilled: false,  // correct — current draft excluded from query
        monthlyFee:            200,
        costMultiplier:        1.5,
        usageCost:             0.2,    // 0.2 × 1.5 = 0.30
      }),
    ]);
    const subtotal = computeSubtotal(items);
    // Must be 500 + 200 + 0.30 = 700.30, NOT 200.30
    expect(subtotal).toBe(700.30);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeDefined();
  });

  it('subtotal excludes setup fee only when billed on a DIFFERENT prior invoice', () => {
    const items = buildLineItems([
      makeAgent({
        setupFee:              500,
        setupFeeAlreadyBilled: true,   // correct — prior month's invoice had it
        monthlyFee:            200,
        costMultiplier:        1.5,
        usageCost:             0.2,    // 0.2 × 1.5 = 0.30
      }),
    ]);
    const subtotal = computeSubtotal(items);
    // Must be 200 + 0.30 = 200.30 (setup fee already paid)
    expect(subtotal).toBe(200.30);
    expect(items.find(i => i.type === 'SETUP_FEE')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildLineItems — two agents (regression: recalculate after new agent added)
// ---------------------------------------------------------------------------
describe('buildLineItems — two agents', () => {
  /**
   * Regression: when a second agent is assigned and the user clicks
   * "Update Bill", buildLineItems must return ALL line items for ALL agents.
   * The recalculate path must replace every item (not just USAGE_FEE) so
   * the new agent's SETUP_FEE + MONTHLY_FEE appear on the invoice.
   */
  it('returns setup + monthly items for both agents', () => {
    const agentA = makeAgent({
      retellAgentId:         'agent-A',
      agentName:             'Agent A',
      setupFee:              500,
      setupFeeAlreadyBilled: false,
      monthlyFee:            200,
    });
    const agentB = makeAgent({
      retellAgentId:         'agent-B',
      agentName:             'Agent B',
      setupFee:              300,
      setupFeeAlreadyBilled: false,
      monthlyFee:            100,
    });
    const items = buildLineItems([agentA, agentB]);

    expect(items.filter(i => i.type === 'SETUP_FEE')).toHaveLength(2);
    expect(items.filter(i => i.type === 'MONTHLY_FEE')).toHaveLength(2);
    expect(computeSubtotal(items)).toBe(1100); // 500+200+300+100
  });

  it('subtotal for two agents with usage sums all six items', () => {
    const agentA = makeAgent({
      retellAgentId: 'agent-A', agentName: 'Agent A',
      setupFee: 500, setupFeeAlreadyBilled: false,
      monthlyFee: 200, costMultiplier: 1.5, usageCost: 0.2, // 0.2 × 1.5 = 0.30
    });
    const agentB = makeAgent({
      retellAgentId: 'agent-B', agentName: 'Agent B',
      setupFee: 300, setupFeeAlreadyBilled: false,
      monthlyFee: 100, costMultiplier: 1.0, usageCost: 0.1, // 0.1 × 1.0 = 0.10
    });
    const items = buildLineItems([agentA, agentB]);
    // 500 + 200 + 0.30 + 300 + 100 + 0.10 = 1100.40
    expect(computeSubtotal(items)).toBeCloseTo(1100.40, 2);
    expect(items).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// computeAgentBillingPeriod — anniversary-based billing
// ---------------------------------------------------------------------------
describe('computeAgentBillingPeriod', () => {
  function d(iso: string) { return new Date(iso); }

  it('Jan 15 assigned, now Jan 20 → period Jan 15 – Feb 14', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-15T00:00:00.000Z'), d('2026-01-20T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-15T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-02-14T23:59:59.999Z'));
  });

  it('Jan 15 assigned, now Feb 15 (anniversary) → period Feb 15 – Mar 14', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-15T00:00:00.000Z'), d('2026-02-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-02-15T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-03-14T23:59:59.999Z'));
  });

  it('Jan 15 assigned, now Feb 14 (last day of period) → period Jan 15 – Feb 14', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-15T00:00:00.000Z'), d('2026-02-14T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-15T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-02-14T23:59:59.999Z'));
  });

  it('Jan 15 assigned, now Mar 1 → period Feb 15 – Mar 14', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-15T00:00:00.000Z'), d('2026-03-01T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-02-15T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-03-14T23:59:59.999Z'));
  });

  it('Mar 20 assigned, now Mar 20 (same day) → period Mar 20 – Apr 19', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-03-20T00:00:00.000Z'), d('2026-03-20T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-03-20T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-04-19T23:59:59.999Z'));
  });

  it('Jan 31 assigned, now Feb 15 → period Jan 31 – Feb 27 (capped)', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-31T00:00:00.000Z'), d('2026-02-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-31T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-02-27T23:59:59.999Z'));
  });

  it('Jan 31 assigned, now Mar 15 → period Feb 28 – Mar 30 (capped)', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-01-31T00:00:00.000Z'), d('2026-03-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-02-28T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-03-30T23:59:59.999Z'));
  });

  it('Mar 31 assigned, now Apr 15 → period Mar 31 – Apr 29 (capped)', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2026-03-31T00:00:00.000Z'), d('2026-04-15T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-03-31T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-04-29T23:59:59.999Z'));
  });

  it('Jan 1 2025 assigned, now Jan 5 2026 → period Jan 1 2026 – Jan 31 2026', () => {
    const { periodStart, periodEnd } = computeAgentBillingPeriod(
      d('2025-01-01T00:00:00.000Z'), d('2026-01-05T00:00:00.000Z')
    );
    expect(periodStart).toEqual(d('2026-01-01T00:00:00.000Z'));
    expect(periodEnd).toEqual(d('2026-01-31T23:59:59.999Z'));
  });
});

// ---------------------------------------------------------------------------
// isInvoiceOverdue — 8-day grace period from period start (due on day 8)
// ---------------------------------------------------------------------------
describe('isInvoiceOverdue', () => {
  const PERIOD_START_JAN = new Date('2026-01-01T00:00:00.000Z');

  it('returns false when DRAFT on day 7 (inside grace period)', () => {
    const now = new Date('2026-01-08T00:00:00.000Z'); // Jan 1 + 7 days
    expect(isInvoiceOverdue('DRAFT', PERIOD_START_JAN, now)).toBe(false);
  });

  it('returns true when DRAFT on day 8 exactly (overdue on day 8)', () => {
    const now = new Date('2026-01-09T00:00:00.000Z'); // Jan 1 + 8 days
    expect(isInvoiceOverdue('DRAFT', PERIOD_START_JAN, now)).toBe(true);
  });

  it('returns true when DRAFT on day 14 (past grace period)', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    expect(isInvoiceOverdue('DRAFT', PERIOD_START_JAN, now)).toBe(true);
  });

  it('returns true when PENDING on day 8 (payment in-flight, still overdue)', () => {
    const now = new Date('2026-01-09T00:00:00.000Z');
    expect(isInvoiceOverdue('PENDING', PERIOD_START_JAN, now)).toBe(true);
  });

  it('returns false when PAID on day 8 — already settled', () => {
    const now = new Date('2026-01-09T00:00:00.000Z');
    expect(isInvoiceOverdue('PAID', PERIOD_START_JAN, now)).toBe(false);
  });

  it('returns false when already OVERDUE — no double-transition', () => {
    const now = new Date('2026-01-09T00:00:00.000Z');
    expect(isInvoiceOverdue('OVERDUE', PERIOD_START_JAN, now)).toBe(false);
  });

  it('returns false when CANCELLED on day 8', () => {
    const now = new Date('2026-01-09T00:00:00.000Z');
    expect(isInvoiceOverdue('CANCELLED', PERIOD_START_JAN, now)).toBe(false);
  });

  it('returns false when DRAFT on day 0 (same day as period start)', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(isInvoiceOverdue('DRAFT', PERIOD_START_JAN, now)).toBe(false);
  });
});
