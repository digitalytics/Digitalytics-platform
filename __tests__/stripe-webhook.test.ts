/**
 * Tests for POST /api/webhooks/stripe
 *
 * Mocks: @/lib/stripe, @/lib/prisma
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConstructEvent    = jest.fn();
const mockPrismaInvoiceUpdateMany  = jest.fn();
const mockPrismaInvoiceFindFirst   = jest.fn();
const mockPrismaUserUpdate         = jest.fn();

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findFirst:  (...args: unknown[]) => mockPrismaInvoiceFindFirst(...args),
      updateMany: (...args: unknown[]) => mockPrismaInvoiceUpdateMany(...args),
    },
    user: {
      update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { POST } from '../app/api/webhooks/stripe/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: string, sig: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sig !== null) headers['stripe-signature'] = sig;
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

describe('POST /api/webhooks/stripe', () => {

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature is invalid (constructEvent throws)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeRequest('{}', 'bad_sig'));
    expect(res.status).toBe(400);
  });

  it('marks invoice PAID and sets paidAt + stripePaymentIntentId on checkout.session.completed', async () => {
    const sessionPayload = {
      id: 'cs_completed',
      payment_intent: 'pi_123',
      customer: 'cus_abc',
      metadata: { invoiceId: 'inv_1' },
    };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });
    mockPrismaInvoiceFindFirst.mockResolvedValue({ id: 'inv_1', userId: 'user_1' });
    mockPrismaInvoiceUpdateMany.mockResolvedValue({ count: 1 });
    mockPrismaUserUpdate.mockResolvedValue({});

    const res = await POST(makeRequest(JSON.stringify(sessionPayload), 'valid_sig'));
    expect(res.status).toBe(200);

    expect(mockPrismaInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAID',
          stripePaymentIntentId: 'pi_123',
        }),
      })
    );
    // paidAt should be set
    const callArg = mockPrismaInvoiceUpdateMany.mock.calls[0][0];
    expect(callArg.data.paidAt).toBeInstanceOf(Date);
  });

  it('syncs user.stripeCustomerId when it is null on checkout.session.completed', async () => {
    const sessionPayload = {
      id: 'cs_completed',
      payment_intent: 'pi_123',
      customer: 'cus_abc',
      metadata: { invoiceId: 'inv_1' },
    };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });
    mockPrismaInvoiceFindFirst.mockResolvedValue({ id: 'inv_1', userId: 'user_1' });
    mockPrismaInvoiceUpdateMany.mockResolvedValue({ count: 1 });
    mockPrismaUserUpdate.mockResolvedValue({});

    await POST(makeRequest(JSON.stringify(sessionPayload), 'valid_sig'));

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeCustomerId: 'cus_abc' }),
      })
    );
  });

  it('reverts invoice to DRAFT and clears stripeCheckoutSessionId on checkout.session.expired', async () => {
    const sessionPayload = { id: 'cs_expired', metadata: {} };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.expired',
      data: { object: sessionPayload },
    });
    mockPrismaInvoiceUpdateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest(JSON.stringify(sessionPayload), 'valid_sig'));
    expect(res.status).toBe(200);

    expect(mockPrismaInvoiceUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          stripeCheckoutSessionId: null,
        }),
      })
    );
  });

  it('returns 200 noop (no crash) for unknown event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    });

    const res = await POST(makeRequest('{}', 'valid_sig'));
    expect(res.status).toBe(200);
    expect(mockPrismaInvoiceUpdateMany).not.toHaveBeenCalled();
  });

  it('handles gracefully when no invoice matches stripeCheckoutSessionId on completed event', async () => {
    const sessionPayload = {
      id: 'cs_unknown',
      payment_intent: 'pi_999',
      customer: 'cus_abc',
      metadata: { invoiceId: 'inv_missing' },
    };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });
    mockPrismaInvoiceFindFirst.mockResolvedValue(null); // invoice not found

    const res = await POST(makeRequest(JSON.stringify(sessionPayload), 'valid_sig'));
    // Should not crash — return 200
    expect(res.status).toBe(200);
  });
});
