import Stripe from 'stripe';

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

/**
 * Returns the Stripe singleton, initialising it on first use.
 * Using a getter means the Stripe constructor is never called at module-load
 * time (e.g. during `next build` static analysis), which would throw when
 * STRIPE_SECRET_KEY is not present in the build environment.
 */
export function getStripe(): Stripe {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover' as const,
    });
  }
  return globalForStripe.stripe;
}

/** Convenience re-export for callers that used the old `stripe` singleton. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
