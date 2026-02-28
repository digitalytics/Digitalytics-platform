// Products that are billed as add-ons (shown in a separate section)
const ADD_ON_PRODUCTS = new Set(['llm_token_surcharge']);

export const PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  retell_voice_engine:  'Voice Engine',
  elevenlabs_tts_new:   'Text-to-Speech',
  elevenlabs_tts:       'Text-to-Speech',
  gpt_4_1:              'AI Language Model',
  gpt_4o:               'AI Language Model',
  gpt_4o_mini:          'AI Language Model',
  gpt_4:                'AI Language Model',
  llm_token_surcharge:  'AI Processing',
  us_twilio_telephony:  'Telephony',
  twilio_telephony:     'Telephony',
  default_telephony:    'Telephony',
};

export function formatProductName(product: string): string {
  return (
    PRODUCT_DISPLAY_NAMES[product] ??
    product.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

/**
 * Compute the user-facing cost for a call.
 * When costMultiplier is null/undefined/0, defaults to 1× (raw Retell cost).
 * Returns null when totalCost is null/undefined/0.
 */
export function computeUserCost(
  totalCost: number | string | null | undefined,
  costMultiplier: number | null | undefined,
): number | null {
  if (totalCost == null) return null;
  const cost = Number(totalCost);
  if (isNaN(cost) || cost === 0) return null;
  const multiplier = costMultiplier != null && costMultiplier > 0 ? costMultiplier : 1;
  return Math.round(cost * multiplier * 100) / 100;
}

/**
 * Format a duration in seconds as M:SS (or MM:SS for large values).
 * Returns '—' for null/undefined/0.
 */
export function formatDurationSecs(secs: number | null | undefined): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface ProductBreakdown {
  name:     string;   // friendly display name
  userCost: number;   // user-facing cost in dollars (proportional, after multiplier)
  pct:      number;   // percentage of total (0-100)
  isAddon:  boolean;  // whether this is an add-on (shown in separate section)
}

/**
 * Compute the per-product breakdown of a user's call cost.
 * Uses proportional shares — Retell's absolute prices are never surfaced.
 */
/**
 * Derive total cost in dollars from costDetails.
 * combined_cost is stored in cents (confirmed: combined_cost / total_cost = 100 exactly).
 * Returns null when combined_cost is absent or zero.
 */
export function totalCostFromDetails(
  costDetails: { combined_cost?: number } | null | undefined,
): number | null {
  if (!costDetails?.combined_cost) return null;
  return costDetails.combined_cost / 100;
}

/**
 * Format a user-facing cost for display.
 * Uses 2dp for amounts >= $0.01 to avoid showing misleading "$0.00" for tiny charges.
 * Uses 4dp for amounts between $0 and $0.01.
 */
export function formatUserCostDisplay(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function computeBreakdown(
  costDetails: {
    product_costs?: Array<{ product?: string; cost?: number }>;
    combined_cost?: number;
  } | null,
  userCost: number,
): ProductBreakdown[] {
  if (!costDetails?.product_costs?.length || !costDetails.combined_cost) return [];
  return costDetails.product_costs
    .filter(p => p.cost != null && p.cost > 0)
    .map(p => {
      const share = p.cost! / costDetails.combined_cost!;
      const uc = Math.round(share * userCost * 10000) / 10000;
      const productKey = p.product ?? '';
      return {
        name:     formatProductName(productKey || 'Unknown'),
        userCost: uc,
        pct:      Math.round(share * 100),
        isAddon:  ADD_ON_PRODUCTS.has(productKey),
      };
    });
}
