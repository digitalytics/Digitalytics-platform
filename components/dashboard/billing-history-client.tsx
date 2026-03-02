'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText, CheckCircle, Clock,
  ChevronDown, ChevronUp, CreditCard, Loader2, Receipt,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils';
import { getOldestOverdueInvoice, resolveInvoicePayability } from '@/lib/billing-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
  id:          string;
  type:        string;
  agentId:     string | null;
  agentName:   string | null;
  description: string;
  quantity:    number;
  unitPrice:   number;
  total:       number;
}

interface Invoice {
  id:            string;
  invoiceNumber: string;
  periodStart:   string;
  periodEnd:     string;
  status:        string;
  subtotal:      number;
  total:         number;
  paidAt:        string | null;
  createdAt:     string;
  lineItems:     LineItem[];
}

interface Props {
  invoices: Invoice[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PAID:    'success',
  PENDING: 'warning',
  OVERDUE: 'danger',
  DRAFT:   'neutral',
};

const LINE_ITEM_LABEL: Record<string, string> = {
  SETUP_FEE:   'Setup Fee',
  MONTHLY_FEE: 'Monthly Service Fee',
  USAGE_FEE:   'Usage Fee',
};

function formatPeriod(start: string) {
  const d = new Date(start);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ── Invoice Card ───────────────────────────────────────────────────────────────

interface InvoiceCardProps {
  invoice:      Invoice;
  canPay:       boolean;
  onPay:        () => void;
  isPaying:     boolean;
  blockMessage: string | null;
}

function InvoiceCard({ invoice, canPay, onPay, isPaying, blockMessage }: InvoiceCardProps) {
  const [open, setOpen] = useState(false);
  const PAYABLE = new Set(['DRAFT', 'PENDING', 'OVERDUE']);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-[#004D3E]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 font-mono text-sm">
                {invoice.invoiceNumber}
              </span>
              <Badge variant={STATUS_VARIANT[invoice.status] ?? 'neutral'}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatPeriod(invoice.periodStart)}
              {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatMoney(invoice.total)}</p>
            <p className="text-xs text-gray-400">total due</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            {PAYABLE.has(invoice.status) && (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!canPay || isPaying}
                onClick={onPay}
              >
                {isPaying ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                ) : (
                  <><CreditCard className="w-3.5 h-3.5" /> Pay Now</>
                )}
              </Button>
            )}
            {blockMessage && (
              <p className="text-xs text-amber-600 mt-1">{blockMessage}</p>
            )}
          </div>

          <button
            onClick={() => setOpen(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={open ? 'Collapse' : 'Expand line items'}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.lineItems.map(li => (
                <tr key={li.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{LINE_ITEM_LABEL[li.type] ?? li.type}</p>
                    {li.agentName && <p className="text-xs text-gray-400 mt-0.5">{li.agentName}</p>}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                    {li.type === 'USAGE_FEE' ? '—' : li.quantity}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                    {li.type === 'USAGE_FEE' ? '—' : formatMoney(li.unitPrice)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {formatMoney(li.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                <td className="px-5 py-3 text-right text-base font-bold text-gray-900 tabular-nums">
                  {formatMoney(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BillingHistoryClient({ invoices }: Props) {
  const searchParams   = useSearchParams();
  const paymentStatus  = searchParams.get('payment');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payError, setPayError]               = useState<string | null>(null);

  const overdueBlocker = getOldestOverdueInvoice(invoices);

  const handlePay = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    setPayError(null);
    try {
      const res  = await fetch(`/api/billing/invoices/${invoiceId}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error ?? 'Payment failed.'); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError('Network error. Please try again.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No invoices yet. Generate your first bill from the Current Bill page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment result banners */}
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium">Payment successful! Your invoice has been marked as paid.</p>
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium">Payment was cancelled. Your invoice is still outstanding.</p>
        </div>
      )}
      {payError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{payError}</p>
      )}

      {/* Overdue warning */}
      {overdueBlocker && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800">
          <p className="text-sm font-medium">
            You have an overdue invoice. Please pay it before paying newer invoices.
          </p>
        </div>
      )}

      {/* Invoice list */}
      {invoices.map(inv => {
        const { canPay, blockMessage } = resolveInvoicePayability(inv, overdueBlocker);
        return (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            canPay={canPay}
            onPay={() => handlePay(inv.id)}
            isPaying={payingInvoiceId === inv.id}
            blockMessage={blockMessage}
          />
        );
      })}
    </div>
  );
}
