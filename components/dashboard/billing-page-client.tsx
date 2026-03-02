'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Receipt, Calendar, Bot, CheckCircle, Clock,
  ChevronDown, ChevronUp, CreditCard, FileText, Loader2,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils';
import { resolveGetBillButton, getOldestOverdueInvoice, resolveInvoicePayability } from '@/lib/billing-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BillingAgent {
  retellAgentId:  string;
  name:           string;
  isActive:       boolean;
  phoneNumber:    string | null;
  assignedAt:     string;
  setupFee:       number | null;
  setupFeePaid:   boolean;
  monthlyFee:     number | null;
  costMultiplier: number | null;
  retellCost:     number;
  usageCost:      number;
}

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
  agents:             BillingAgent[];
  invoices:           Invoice[];
  hasCurrentInvoice:  boolean;
  totalMonthly:       number;
  outstandingSetup:   number;
  activeCount:        number;
}

// ── Domain constants ───────────────────────────────────────────────────────────

const PAYABLE_STATUSES = new Set(['DRAFT', 'PENDING', 'OVERDUE']);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
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
            {(canPay || PAYABLE_STATUSES.has(invoice.status)) && (
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

      {/* Line items */}
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

export function BillingPageClient({
  agents,
  invoices,
  hasCurrentInvoice,
  totalMonthly,
  outstandingSetup,
  activeCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const paymentStatus = searchParams.get('payment'); // 'success' | 'cancelled' | null

  const totalOutstanding = invoices
    .filter(inv => PAYABLE_STATUSES.has(inv.status))
    .reduce((s, inv) => s + inv.total, 0);

  // Use date-range check to avoid UTC/local-time mismatch on string prefix.
  const now = new Date();
  const currentInvoice = invoices.find(inv =>
    new Date(inv.periodStart) <= now && now <= new Date(inv.periodEnd)
  ) ?? null;
  const pastInvoices = invoices.filter(inv => inv !== currentInvoice);

  const overdueBlocker = getOldestOverdueInvoice(invoices);

  const btnState = resolveGetBillButton(
    (currentInvoice?.status ?? null) as Parameters<typeof resolveGetBillButton>[0]
  );

  const handleGetBill = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/billing/invoice/generate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setGenerateError(data.error ?? 'Failed to generate invoice.');
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setGenerateError('Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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

  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No agents assigned yet. Contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-[#004D3E]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Monthly Fees</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{formatMoney(totalMonthly)}</p>
            <p className="text-xs text-gray-400">recurring / month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            totalOutstanding > 0 ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <CreditCard className={`w-5 h-5 ${totalOutstanding > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding Balance</p>
            <p className={`text-xl font-bold mt-0.5 ${totalOutstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatMoney(totalOutstanding)}
            </p>
            <p className="text-xs text-gray-400">across all invoices</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#004D3E]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Agents</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{activeCount}</p>
            <p className="text-xs text-gray-400">of {agents.length} assigned</p>
          </div>
        </div>

      </div>

      {/* ── Payment result banners ───────────────────────────────────────── */}
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

      {/* ── This month's invoice ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">This Month's Invoice</h2>
          <Button
            size="sm"
            onClick={handleGetBill}
            disabled={btnState.disabled || isGenerating || isPending}
          >
            {isGenerating || isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            ) : (
              <><Receipt className="w-3.5 h-3.5" /> {btnState.label}</>
            )}
          </Button>
        </div>

        {generateError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{generateError}</p>
        )}

        {currentInvoice ? (() => {
          const { canPay, blockMessage } = resolveInvoicePayability(currentInvoice, overdueBlocker);
          return (
            <InvoiceCard
              invoice={currentInvoice}
              canPay={canPay}
              onPay={() => handlePay(currentInvoice.id)}
              isPaying={payingInvoiceId === currentInvoice.id}
              blockMessage={blockMessage}
            />
          );
        })() : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-400">No invoice generated yet. Click "Get Bill" above.</p>
          </div>
        )}
      </div>

      {/* ── Agent cost breakdown (live estimate) ────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Agent Cost Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live estimate for the current billing period</p>
        </div>

        {agents.map(agent => (
          <div key={agent.retellAgentId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Agent header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{agent.name}</p>
                  <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {agent.phoneNumber && (
                  <p className="text-xs text-gray-400 mt-0.5">{agent.phoneNumber}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Since {formatDate(agent.assignedAt)}</span>
              </div>
            </div>

            {/* Cost rows */}
            <div className="divide-y divide-gray-50">
              {agent.setupFee != null && (
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Setup Fee</p>
                    <p className="text-xs text-gray-400 mt-0.5">One-time charge</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(agent.setupFee)}</span>
                    {agent.setupFeePaid ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Unpaid
                      </span>
                    )}
                  </div>
                </div>
              )}

              {agent.monthlyFee != null && (
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Monthly Service Fee</p>
                    <p className="text-xs text-gray-400 mt-0.5">Recurring monthly charge</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(agent.monthlyFee)}</span>
                    <p className="text-xs text-gray-400 mt-0.5">/ month</p>
                  </div>
                </div>
              )}

              <div className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usage This Month</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {agent.costMultiplier != null
                      ? 'Usage charged this period'
                      : 'No multiplier configured'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {agent.costMultiplier != null ? formatMoney(agent.usageCost) : '—'}
                  </span>
                  {agent.costMultiplier != null && (
                    <p className="text-xs text-gray-400 mt-0.5">this month</p>
                  )}
                </div>
              </div>
            </div>

            {/* Agent subtotal */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Agent Total (est.)</span>
              <span className="text-sm font-bold text-gray-900">
                {formatMoney(
                  (agent.setupFeePaid ? 0 : (agent.setupFee ?? 0)) +
                  (agent.monthlyFee ?? 0) +
                  (agent.costMultiplier != null ? agent.usageCost : 0)
                )}
              </span>
            </div>
          </div>
        ))}

        {/* Estimated grand total */}
        <div className="bg-[#004D3E] rounded-xl px-5 py-4 flex items-center justify-between text-white">
          <div>
            <p className="font-semibold">Estimated Total This Month</p>
            <p className="text-xs text-white/60 mt-0.5">
              {!currentInvoice
                ? 'Click "Get Bill" above to generate your invoice'
                : currentInvoice.status === 'DRAFT'
                  ? 'Click "Update Bill" above to include any new usage'
                  : 'See your invoice above for the exact amount'}
            </p>
          </div>
          <p className="text-2xl font-bold">
            {formatMoney(
              outstandingSetup +
              totalMonthly +
              agents.reduce((s, a) => s + (a.costMultiplier != null ? a.usageCost : 0), 0)
            )}
          </p>
        </div>
      </div>

      {/* ── Invoice history ──────────────────────────────────────────────── */}
      {pastInvoices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Invoice History</h2>

          {overdueBlocker && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800">
              <p className="text-sm font-medium">
                You have an overdue invoice. Please pay it before paying other invoices.
              </p>
            </div>
          )}

          {pastInvoices.map(inv => {
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
      )}

    </div>
  );
}
