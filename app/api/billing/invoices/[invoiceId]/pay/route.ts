/**
 * POST /api/billing/invoices/[invoiceId]/pay
 *
 * Initiates payment for an invoice.
 *
 * Current state: stub — returns 501 until Stripe is configured.
 *
 * Stripe integration plan (implement when ready):
 *   1. Look up or create a Stripe Customer for session.user.id
 *      → store stripeCustomerId on the User record
 *   2. Create a Stripe Checkout Session with:
 *      - line_items derived from invoice.lineItems
 *      - success_url: /billing?payment=success
 *      - cancel_url:  /billing?payment=cancelled
 *   3. Store stripeCheckoutSessionId on the Invoice record
 *   4. Move invoice status to PENDING
 *   5. Return { checkoutUrl } → client redirects to Stripe-hosted checkout
 *
 * Stripe webhook (app/api/webhooks/stripe/route.ts — create when ready):
 *   - checkout.session.completed → mark invoice PAID, set paidAt + stripePaymentIntentId
 *   - checkout.session.expired   → revert invoice to DRAFT so user can retry
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAYABLE_STATUSES = new Set(['DRAFT', 'PENDING', 'OVERDUE']);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { invoiceId } = await params;

  // Verify the invoice belongs to the authenticated user
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: session.user.id },
    select: { id: true, status: true, total: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (!PAYABLE_STATUSES.has(invoice.status)) {
    return NextResponse.json(
      { error: `Invoice cannot be paid (status: ${invoice.status})` },
      { status: 422 }
    );
  }

  // ── Stripe integration goes here ──────────────────────────────────────────
  // TODO: implement when Stripe keys are configured
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });
  //
  // Step 1: ensure Stripe customer exists for this user
  // Step 2: create Checkout Session
  // Step 3: update invoice with stripeCheckoutSessionId + status PENDING
  // Step 4: return { checkoutUrl }
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json(
    { error: 'Payment not yet configured. Stripe integration coming soon.' },
    { status: 501 }
  );
}
