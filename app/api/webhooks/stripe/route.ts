/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events.
 *
 * Events handled:
 *   - checkout.session.completed → mark invoice PAID
 *   - checkout.session.expired   → revert invoice to DRAFT
 *
 * IMPORTANT: Stripe requires the raw (unparsed) request body to verify
 * the webhook signature. In Next.js App Router, req.text() gives us that.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;

        if (!invoiceId) break;

        const invoice = await prisma.invoice.findFirst({
          where:  { id: invoiceId, stripeCheckoutSessionId: session.id },
          select: {
            id:        true,
            userId:    true,
            lineItems: { where: { type: 'SETUP_FEE' }, select: { agentId: true } },
          },
        });

        if (!invoice) break;

        await prisma.invoice.updateMany({
          where: { id: invoice.id },
          data:  {
            status:               'PAID',
            paidAt:               new Date(),
            stripePaymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
          },
        });

        // Mark setup fees as paid on each affected UserAgent
        const setupFeeAgentIds = invoice.lineItems
          .map(li => li.agentId)
          .filter((id): id is string => id != null);

        if (setupFeeAgentIds.length > 0) {
          await prisma.userAgent.updateMany({
            where: { userId: invoice.userId, agentId: { in: setupFeeAgentIds } },
            data:  { setupFeePaid: true },
          });
        }

        // Sync stripeCustomerId on user if not already set
        if (session.customer && typeof session.customer === 'string') {
          await prisma.user.update({
            where: { id: invoice.userId },
            data:  { stripeCustomerId: session.customer },
          });
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;

        await prisma.invoice.updateMany({
          where: { stripeCheckoutSessionId: session.id },
          data:  { status: 'DRAFT', stripeCheckoutSessionId: null },
        });

        break;
      }

      default:
        // Unknown event — noop (don't crash)
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
