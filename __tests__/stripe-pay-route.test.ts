/**
 * Tests for POST /api/billing/invoices/[invoiceId]/pay
 *
 * Mocks: @/lib/auth, @/lib/prisma, @/lib/stripe
 */

// ── Mocks (must be defined before imports) ────────────────────────────────────

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({ auth: () => mockAuth() }));

const mockPrismaInvoiceFindFirst = jest.fn();
const mockPrismaInvoiceUpdate    = jest.fn();
const mockPrismaUserUpdate       = jest.fn();
const mockPrismaUserFindUnique   = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findFirst: (...args: unknown[]) => mockPrismaInvoiceFindFirst(...args),
      update:    (...args: unknown[]) => mockPrismaInvoiceUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
      update:     (...args: unknown[]) => mockPrismaUserUpdate(...args),
    },
  },
}));

const mockCheckoutSessionsCreate  = jest.fn();
const mockCustomersCreate         = jest.fn();

jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: (...args: unknown[]) => mockCustomersCreate(...args) },
    checkout: {
      sessions: { create: (...args: unknown[]) => mockCheckoutSessionsCreate(...args) },
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { POST } from '../app/api/billing/invoices/[invoiceId]/pay/route';
import { NextResponse } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest() {
  return new Request('http://localhost/api/billing/invoices/inv_1/pay', { method: 'POST' });
}

function makeParams(invoiceId = 'inv_1') {
  return { params: Promise.resolve({ invoiceId }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/billing/invoices/[invoiceId]/pay', () => {

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns 404 when invoice not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 404 when invoice belongs to a different user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_2' } });
    // Prisma WHERE clause filters by userId — findFirst returns null
    mockPrismaInvoiceFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 422 when invoice is PAID', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'PAID', total: 100,
      lineItems: [{ id: 'li_1', description: 'Monthly', total: 100 }],
    });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(422);
  });

  it('returns 422 when invoice is CANCELLED', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'CANCELLED', total: 100,
      lineItems: [{ id: 'li_1', description: 'Monthly', total: 100 }],
    });

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(422);
  });

  it('returns 200 with checkoutUrl for a DRAFT invoice (happy path)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 150,
      lineItems: [{ id: 'li_1', description: 'Monthly Fee', total: 150 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test');
  });

  it('returns 200 with checkoutUrl for an OVERDUE invoice (happy path)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'OVERDUE', total: 200,
      lineItems: [{ id: 'li_1', description: 'Usage', total: 200 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });

  it('creates a new Stripe customer when user has no stripeCustomerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: null, email: 'test@example.com', name: 'Test User' });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockPrismaUserUpdate.mockResolvedValue({});
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    await POST(makeRequest(), makeParams());

    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeCustomerId: 'cus_new' }),
      })
    );
  });

  it('reuses existing stripeCustomerId without creating a duplicate customer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    await POST(makeRequest(), makeParams());

    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('updates invoice.stripeCheckoutSessionId in DB after session creation', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_session_123', url: 'https://checkout.stripe.com/pay/cs_session_123' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    await POST(makeRequest(), makeParams());

    expect(mockPrismaInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeCheckoutSessionId: 'cs_session_123' }),
      })
    );
  });

  it('sets invoice.status to PENDING after checkout session created', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/cs_test' });
    mockPrismaInvoiceUpdate.mockResolvedValue({});

    await POST(makeRequest(), makeParams());

    expect(mockPrismaInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      })
    );
  });

  it('returns 500 when Stripe throws an error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user_1' } });
    mockPrismaInvoiceFindFirst.mockResolvedValue({
      id: 'inv_1', status: 'DRAFT', total: 100,
      lineItems: [{ id: 'li_1', description: 'Fee', total: 100 }],
    });
    mockPrismaUserFindUnique.mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_existing' });
    mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'));

    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });
});
