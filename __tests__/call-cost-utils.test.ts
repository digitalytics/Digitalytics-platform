import {
  formatProductName,
  computeBreakdown,
  computeUserCost,
  formatDurationSecs,
  totalCostFromDetails,
  formatUserCostDisplay,
} from '../lib/call-cost-utils';

// ── formatProductName ────────────────────────────────────────────────────────

describe('formatProductName', () => {
  it('returns known display names for Retell products', () => {
    expect(formatProductName('retell_voice_engine')).toBe('Voice Engine');
    expect(formatProductName('elevenlabs_tts_new')).toBe('Text-to-Speech');
    expect(formatProductName('elevenlabs_tts')).toBe('Text-to-Speech');
    expect(formatProductName('gpt_4_1')).toBe('AI Language Model');
    expect(formatProductName('gpt_4o')).toBe('AI Language Model');
    expect(formatProductName('gpt_4o_mini')).toBe('AI Language Model');
    expect(formatProductName('gpt_4')).toBe('AI Language Model');
    expect(formatProductName('llm_token_surcharge')).toBe('AI Processing');
    expect(formatProductName('us_twilio_telephony')).toBe('Telephony');
    expect(formatProductName('twilio_telephony')).toBe('Telephony');
    expect(formatProductName('default_telephony')).toBe('Telephony');
  });

  it('formats unknown products by replacing underscores and capitalizing words', () => {
    expect(formatProductName('some_unknown_product')).toBe('Some Unknown Product');
    expect(formatProductName('single')).toBe('Single');
  });
});

// ── computeUserCost ──────────────────────────────────────────────────────────

describe('computeUserCost', () => {
  it('returns null when totalCost is null', () => {
    expect(computeUserCost(null, 1.5)).toBeNull();
    expect(computeUserCost(undefined, 1.5)).toBeNull();
  });

  it('returns null when totalCost is 0', () => {
    expect(computeUserCost(0, 1.5)).toBeNull();
    expect(computeUserCost('0', 1.5)).toBeNull();
  });

  it('applies costMultiplier when provided', () => {
    expect(computeUserCost(0.5, 2)).toBe(1.0);
    expect(computeUserCost(0.551, 1.5)).toBe(0.83);
    expect(computeUserCost('0.463', 2)).toBe(0.93);
  });

  it('defaults to multiplier of 1 when costMultiplier is null', () => {
    expect(computeUserCost(0.551, null)).toBe(0.55);
    expect(computeUserCost(0.463, null)).toBe(0.46);
  });

  it('defaults to multiplier of 1 when costMultiplier is undefined', () => {
    expect(computeUserCost(0.551, undefined)).toBe(0.55);
  });

  it('defaults to multiplier of 1 when costMultiplier is 0', () => {
    expect(computeUserCost(0.5, 0)).toBe(0.50);
  });

  it('rounds to 2 decimal places', () => {
    expect(computeUserCost(0.001, 3)).toBe(0.0);
    expect(computeUserCost(0.1, 3)).toBe(0.30);
  });
});

// ── computeBreakdown ─────────────────────────────────────────────────────────

const MOCK_COST_DETAILS = {
  product_costs: [
    { product: 'retell_voice_engine', unit_price: 0.0916667, cost: 26.675 },
    { product: 'elevenlabs_tts_new',  unit_price: 0.025,     cost: 7.275  },
    { product: 'gpt_4_1',             unit_price: 0.075,     cost: 21.825 },
    { product: 'llm_token_surcharge',                        cost: 14.6   },
    { product: 'us_twilio_telephony', unit_price: 0.025,     cost: 7.27   },
  ],
  combined_cost: 77.65,
  total_duration_seconds: 214,
};

describe('computeBreakdown', () => {
  it('returns empty array for null costDetails', () => {
    expect(computeBreakdown(null, 1.0)).toEqual([]);
  });

  it('returns empty array when product_costs is empty', () => {
    expect(computeBreakdown({ product_costs: [], combined_cost: 100 }, 1.0)).toEqual([]);
  });

  it('returns empty array when combined_cost is 0 or missing', () => {
    expect(computeBreakdown({ product_costs: [{ product: 'x', cost: 10 }], combined_cost: 0 }, 1.0)).toEqual([]);
    expect(computeBreakdown({ product_costs: [{ product: 'x', cost: 10 }] }, 1.0)).toEqual([]);
  });

  it('returns one entry per non-zero product cost', () => {
    const result = computeBreakdown(MOCK_COST_DETAILS, 1.0);
    expect(result).toHaveLength(5);
  });

  it('excludes products with zero or missing cost', () => {
    const details = {
      product_costs: [
        { product: 'retell_voice_engine', cost: 50 },
        { product: 'zero_product',        cost: 0  },
        { product: 'null_product',        cost: undefined },
      ],
      combined_cost: 50,
    };
    const result = computeBreakdown(details, 1.0);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Voice Engine');
  });

  it('marks llm_token_surcharge as an add-on', () => {
    const result = computeBreakdown(MOCK_COST_DETAILS, 1.0);
    const surcharge = result.find(r => r.name === 'AI Processing');
    expect(surcharge?.isAddon).toBe(true);
  });

  it('marks non-surcharge products as main components', () => {
    const result = computeBreakdown(MOCK_COST_DETAILS, 1.0);
    const voice = result.find(r => r.name === 'Voice Engine');
    expect(voice?.isAddon).toBe(false);
  });

  it('computes proportional user costs that sum approximately to userCost', () => {
    const userCost = 0.551;
    const result = computeBreakdown(MOCK_COST_DETAILS, userCost);
    const totalUserCost = result.reduce((s, r) => s + r.userCost, 0);
    expect(totalUserCost).toBeCloseTo(userCost, 2);
  });

  it('computes percentage shares that sum near 100', () => {
    const result = computeBreakdown(MOCK_COST_DETAILS, 1.0);
    const totalPct = result.reduce((s, r) => s + r.pct, 0);
    expect(totalPct).toBeGreaterThanOrEqual(98);
    expect(totalPct).toBeLessThanOrEqual(102);
  });

  it('handles missing product field gracefully', () => {
    const details = {
      product_costs: [{ cost: 50 }],
      combined_cost: 50,
    };
    const result = computeBreakdown(details, 1.0);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Unknown');
  });
});

// ── formatDurationSecs ───────────────────────────────────────────────────────

describe('formatDurationSecs', () => {
  it('formats seconds under a minute', () => {
    expect(formatDurationSecs(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDurationSecs(214)).toBe('3:34');
    expect(formatDurationSecs(60)).toBe('1:00');
  });

  it('formats hours correctly', () => {
    expect(formatDurationSecs(3661)).toBe('61:01');
  });

  it('returns — for null/0/undefined', () => {
    expect(formatDurationSecs(null)).toBe('—');
    expect(formatDurationSecs(0)).toBe('—');
    expect(formatDurationSecs(undefined)).toBe('—');
  });
});

// ── totalCostFromDetails ─────────────────────────────────────────────────────

describe('totalCostFromDetails', () => {
  it('returns null for null or undefined costDetails', () => {
    expect(totalCostFromDetails(null)).toBeNull();
    expect(totalCostFromDetails(undefined)).toBeNull();
  });

  it('returns null when combined_cost is missing', () => {
    expect(totalCostFromDetails({})).toBeNull();
  });

  it('returns null when combined_cost is 0', () => {
    expect(totalCostFromDetails({ combined_cost: 0 })).toBeNull();
  });

  it('converts cents to dollars (÷ 100)', () => {
    // Verified from DB: combined_cost / total_cost = 100 exactly
    expect(totalCostFromDetails({ combined_cost: 100 })).toBeCloseTo(1.0, 6);
    expect(totalCostFromDetails({ combined_cost: 3.325 })).toBeCloseTo(0.03325, 6);
    expect(totalCostFromDetails({ combined_cost: 1.8333333 })).toBeCloseTo(0.018333333, 6);
    expect(totalCostFromDetails({ combined_cost: 77.65 })).toBeCloseTo(0.7765, 6);
  });
});

// ── formatUserCostDisplay ────────────────────────────────────────────────────

describe('formatUserCostDisplay', () => {
  it('shows 2 decimal places for amounts >= $0.01', () => {
    expect(formatUserCostDisplay(1.5)).toBe('$1.50');
    expect(formatUserCostDisplay(0.551)).toBe('$0.55');
    expect(formatUserCostDisplay(0.01)).toBe('$0.01');
  });

  it('shows 4 decimal places for amounts between $0 and $0.01 to avoid showing $0.00', () => {
    expect(formatUserCostDisplay(0.002108)).toBe('$0.0021');
    expect(formatUserCostDisplay(0.009)).toBe('$0.0090');
    expect(formatUserCostDisplay(0.0001)).toBe('$0.0001');
  });

  it('shows $0.00 for zero', () => {
    expect(formatUserCostDisplay(0)).toBe('$0.00');
  });
});
