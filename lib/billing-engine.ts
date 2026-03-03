/**
 * Pure billing computation logic — no Prisma, no Next.js.
 * Fully unit-testable.
 */

export type LineItemType = 'SETUP_FEE' | 'MONTHLY_FEE' | 'USAGE_FEE';

export interface AgentInput {
  retellAgentId:        string;
  agentName:            string;
  setupFee:             number | null;
  /** True when setup fee appears on a *different*, non-cancelled invoice for this user */
  setupFeeAlreadyBilled: boolean;
  monthlyFee:           number | null;
  /** True when monthly fee appears on a *different*, non-cancelled invoice for the same period.
   *  Used to prevent double-charging on supplement invoices (paid mid-month → new calls → Get Bill). */
  monthlyFeeAlreadyBilled: boolean;
  /** Markup multiplier applied to Retell's actual call cost (e.g. 1.5 = charge 1.5× Retell cost) */
  costMultiplier:       number | null;
  assignedAt:           Date;
  periodStart:          Date;
  periodEnd:            Date;
  /** Sum of Retell totalCost in $, already filtered to [max(assignedAt, periodStart), periodEnd] */
  usageCost:            number;
}

export interface LineItem {
  type:        LineItemType;
  agentId:     string;
  agentName:   string;
  description: string;
  quantity:    number;
  unitPrice:   number;
  total:       number;
}

/** Build the full set of line items for one user's billing period. */
export function buildLineItems(agents: AgentInput[]): LineItem[] {
  const items: LineItem[] = [];

  for (const ag of agents) {
    // SETUP_FEE — one-time, only if not already on a prior (non-cancelled) invoice
    if (ag.setupFee && !ag.setupFeeAlreadyBilled) {
      items.push({
        type:        'SETUP_FEE',
        agentId:     ag.retellAgentId,
        agentName:   ag.agentName,
        description: `Setup fee — ${ag.agentName}`,
        quantity:    1,
        unitPrice:   ag.setupFee,
        total:       ag.setupFee,
      });
    }

    // MONTHLY_FEE — only if not already charged on another invoice for this period
    if (ag.monthlyFee && !ag.monthlyFeeAlreadyBilled) {
      items.push({
        type:        'MONTHLY_FEE',
        agentId:     ag.retellAgentId,
        agentName:   ag.agentName,
        description: `Monthly service fee — ${ag.agentName}`,
        quantity:    1,
        unitPrice:   ag.monthlyFee,
        total:       ag.monthlyFee,
      });
    }

    // USAGE_FEE — usageCost is pre-filtered from DB (assignedAt lower bound already applied)
    if (ag.costMultiplier && ag.usageCost > 0) {
      const total = Math.round(ag.usageCost * ag.costMultiplier * 100) / 100;
      items.push({
        type:        'USAGE_FEE',
        agentId:     ag.retellAgentId,
        agentName:   ag.agentName,
        description: `Usage — ${ag.agentName}`,
        quantity:    ag.usageCost,
        unitPrice:   ag.costMultiplier,
        total,
      });
    }
  }

  return items;
}

/**
 * Returns true when an unpaid invoice is past its 8-day grace period.
 * Due date = periodStart + 8 days (i.e. the 9th of the month for a 1st-of-month start).
 * Used to automatically transition DRAFT/PENDING → OVERDUE without admin input.
 */
export function isInvoiceOverdue(
  status:      string,
  periodStart: Date,
  now:         Date,
): boolean {
  if (!['DRAFT', 'PENDING'].includes(status)) return false;
  const dueDate = new Date(periodStart);
  dueDate.setDate(dueDate.getDate() + 8);   // due on day 8 (e.g. Jan 9 for Jan 1 start)
  return now >= dueDate;
}

/** Sum all line item totals, rounded to 2 decimal places. */
export function computeSubtotal(items: LineItem[]): number {
  return Math.round(items.reduce((s, l) => s + l.total, 0) * 100) / 100;
}

// ── Anniversary billing period ─────────────────────────────────────────────────

export interface BillingPeriod { periodStart: Date; periodEnd: Date }

/**
 * Returns the current billing period for an agent whose cycle starts on
 * the same calendar day as `assignedAt` (anniversary-based billing).
 *
 * Edge case: if the anchor day does not exist in a given month
 * (e.g. Jan 31 → Feb), it is capped to the last day of that month.
 */
export function computeAgentBillingPeriod(assignedAt: Date, now: Date): BillingPeriod {
  const anchorDay = assignedAt.getUTCDate();

  function clamp(year: number, month: number, day: number): number {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Math.min(day, lastDay);
  }

  let startYear  = now.getUTCFullYear();
  let startMonth = now.getUTCMonth();
  // If we haven't yet passed the anchor day this month, step back one month
  if (now.getUTCDate() < anchorDay) {
    startMonth -= 1;
    if (startMonth < 0) { startMonth = 11; startYear -= 1; }
  }

  // Never go before the actual assignedAt
  const candidateStart = Date.UTC(startYear, startMonth, clamp(startYear, startMonth, anchorDay));
  if (candidateStart < assignedAt.getTime()) {
    const endMonth = assignedAt.getUTCMonth() + 1;
    const endYear  = assignedAt.getUTCFullYear() + Math.floor(endMonth / 12);
    return {
      periodStart: new Date(assignedAt.getTime()),
      periodEnd:   new Date(Date.UTC(endYear, endMonth % 12, clamp(endYear, endMonth % 12, anchorDay)) - 1),
    };
  }

  const periodStart = new Date(candidateStart);
  const endMonth    = startMonth + 1;
  const endYear     = startYear + Math.floor(endMonth / 12);
  const periodEnd   = new Date(Date.UTC(endYear, endMonth % 12, clamp(endYear, endMonth % 12, anchorDay)) - 1);
  return { periodStart, periodEnd };
}

/**
 * Return a unique invoice number, incrementing a numeric suffix if the base
 * is already taken (e.g. by a cancelled invoice).
 */
export function generateInvoiceNumber(
  base: string,
  existingNumbers: Set<string>,
): string {
  if (!existingNumbers.has(base)) return base;
  let suffix = 2;
  while (existingNumbers.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}
