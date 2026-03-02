/**
 * Pure logic tests for billing pay-priority helpers.
 * No mocks needed — these are stateless functions.
 */

import {
  getOldestOverdueInvoice,
  resolveInvoicePayability,
} from '../lib/billing-service';

// ── getOldestOverdueInvoice ────────────────────────────────────────────────────

describe('getOldestOverdueInvoice', () => {
  it('returns null when invoices array is empty', () => {
    expect(getOldestOverdueInvoice([])).toBeNull();
  });

  it('returns null when no OVERDUE invoices exist', () => {
    const invoices = [
      { id: 'inv_1', status: 'PAID',    periodStart: '2026-01-01' },
      { id: 'inv_2', status: 'DRAFT',   periodStart: '2026-02-01' },
      { id: 'inv_3', status: 'PENDING', periodStart: '2026-03-01' },
    ];
    expect(getOldestOverdueInvoice(invoices)).toBeNull();
  });

  it('returns the single OVERDUE invoice when there is only one', () => {
    const invoices = [
      { id: 'inv_1', status: 'PAID',    periodStart: '2025-12-01' },
      { id: 'inv_2', status: 'OVERDUE', periodStart: '2026-01-01' },
    ];
    expect(getOldestOverdueInvoice(invoices)).toEqual({
      id: 'inv_2', status: 'OVERDUE', periodStart: '2026-01-01',
    });
  });

  it('returns the oldest OVERDUE when multiple OVERDUE invoices exist', () => {
    const invoices = [
      { id: 'inv_3', status: 'OVERDUE', periodStart: '2026-03-01' },
      { id: 'inv_1', status: 'OVERDUE', periodStart: '2026-01-01' },
      { id: 'inv_2', status: 'OVERDUE', periodStart: '2026-02-01' },
    ];
    const result = getOldestOverdueInvoice(invoices);
    expect(result?.id).toBe('inv_1');
    expect(result?.periodStart).toBe('2026-01-01');
  });

  it('ignores PAID, DRAFT, PENDING invoices when selecting oldest OVERDUE', () => {
    const invoices = [
      { id: 'inv_a', status: 'PAID',    periodStart: '2025-06-01' }, // older but PAID
      { id: 'inv_b', status: 'DRAFT',   periodStart: '2025-07-01' }, // older but DRAFT
      { id: 'inv_c', status: 'PENDING', periodStart: '2025-08-01' }, // older but PENDING
      { id: 'inv_d', status: 'OVERDUE', periodStart: '2026-01-01' },
    ];
    expect(getOldestOverdueInvoice(invoices)?.id).toBe('inv_d');
  });
});

// ── resolveInvoicePayability ───────────────────────────────────────────────────

describe('resolveInvoicePayability', () => {
  it('DRAFT + no blocker → canPay: true, blockMessage: null', () => {
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'DRAFT' }, null))
      .toEqual({ canPay: true, blockMessage: null });
  });

  it('DRAFT + blocker that is a different invoice → canPay: false', () => {
    const blocker = { id: 'inv_old' };
    const result = resolveInvoicePayability({ id: 'inv_1', status: 'DRAFT' }, blocker);
    expect(result.canPay).toBe(false);
    expect(result.blockMessage).toBe('Please pay overdue invoice first.');
  });

  it('DRAFT + blocker that is the same invoice → canPay: true (it IS the one to pay)', () => {
    const blocker = { id: 'inv_1' };
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'DRAFT' }, blocker))
      .toEqual({ canPay: true, blockMessage: null });
  });

  it('PENDING → canPay: false, blockMessage: null (payment already in-flight)', () => {
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'PENDING' }, null))
      .toEqual({ canPay: false, blockMessage: null });
  });

  it('PENDING + blocker → canPay: false, blockMessage: null', () => {
    const blocker = { id: 'inv_old' };
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'PENDING' }, blocker))
      .toEqual({ canPay: false, blockMessage: null });
  });

  it('PAID → canPay: false, blockMessage: null', () => {
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'PAID' }, null))
      .toEqual({ canPay: false, blockMessage: null });
  });

  it('CANCELLED → canPay: false, blockMessage: null', () => {
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'CANCELLED' }, null))
      .toEqual({ canPay: false, blockMessage: null });
  });

  it('OVERDUE + no blocker → canPay: true, blockMessage: null', () => {
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'OVERDUE' }, null))
      .toEqual({ canPay: true, blockMessage: null });
  });

  it('OVERDUE + itself is the blocker → canPay: true (it is the one to pay)', () => {
    const blocker = { id: 'inv_1' };
    expect(resolveInvoicePayability({ id: 'inv_1', status: 'OVERDUE' }, blocker))
      .toEqual({ canPay: true, blockMessage: null });
  });

  it('OVERDUE + a different blocker → canPay: false', () => {
    const blocker = { id: 'inv_older' };
    const result = resolveInvoicePayability({ id: 'inv_1', status: 'OVERDUE' }, blocker);
    expect(result.canPay).toBe(false);
    expect(result.blockMessage).toBe('Please pay overdue invoice first.');
  });
});
