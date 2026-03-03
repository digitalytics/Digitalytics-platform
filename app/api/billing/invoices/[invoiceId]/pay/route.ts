/**
 * POST /api/billing/invoices/[invoiceId]/pay
 *
 * Creates a Stripe Checkout Session for the given invoice and returns
 * { checkoutUrl } so the client can redirect the user to Stripe's hosted page.
 *
 * Flow:
 *   1. Auth check
 *   2. Load invoice (must belong to authenticated user, must be in payable status)
 *   3. Look up / create Stripe Customer for the user
 *   4. Create Stripe Checkout Session
 *   5. Update invoice: stripeCheckoutSessionId + status → PENDING
 *   6. Return { checkoutUrl }
 *
 * Stripe webhooks (app/api/webhooks/stripe/route.ts) handle:
 *   - checkout.session.completed → invoice PAID
 *   - checkout.session.expired   → invoice reverted to DRAFT
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const PAYABLE_STATUSES = new Set(['DRAFT', 'OVERDUE']);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  'http://localhost:3000';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await params;

    // Verify the invoice belongs to the authenticated user and include line items
    const invoice = await prisma.invoice.findFirst({
      where:   { id: invoiceId, userId: session.user.id },
      select:  { id: true, status: true, total: true, lineItems: true },
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

    // ── Stripe Customer ────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, stripeCustomerId: true, email: true, name: true },
    });

    let stripeCustomerId = user?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? undefined,
        name:  user?.name  ?? undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data:  { stripeCustomerId },
      });
    }

    // ── Stripe Checkout Session ────────────────────────────────────────────────
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode:     'payment',
      line_items: invoice.lineItems.map(li => ({
        price_data: {
          currency:     'aud',
          product_data: { name: li.description },
          unit_amount:  Math.round(Number(li.total) * 100),
        },
        quantity: 1,
      })),
      success_url: `${APP_URL}/billing?payment=success`,
      cancel_url:  `${APP_URL}/billing?payment=cancelled`,
      metadata:    { invoiceId: invoice.id },
    });

    // ── Update invoice ─────────────────────────────────────────────────────────
    await prisma.invoice.update({
      where: { id: invoice.id },
      data:  { stripeCheckoutSessionId: checkoutSession.id, status: 'PENDING' },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });

  } catch (err) {
    console.error('[pay route] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
