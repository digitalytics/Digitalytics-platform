/**
 * POST /api/billing/invoice/generate
 *
 * User-triggered invoice generation for the current billing period.
 * Idempotent — safe to call multiple times; returns existing invoice if already generated.
 *
 * Domain flow:
 *   null / CANCELLED  →  create fresh DRAFT invoice
 *   DRAFT             →  recalculate USAGE_FEE and return updated invoice
 *   PENDING/PAID/OVERDUE → return as-is (no mutation)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureCurrentInvoice } from '@/lib/billing-service';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invoice = await ensureCurrentInvoice(session.user.id);

  if (!invoice) {
    return NextResponse.json(
      { error: 'No billable items found for this account.' },
      { status: 422 }
    );
  }

  return NextResponse.json({ invoice });
}
