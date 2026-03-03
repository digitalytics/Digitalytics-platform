'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt, Calendar, Bot, CheckCircle, Clock,
  ChevronDown, ChevronUp, CreditCard, FileText, Loader2,
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils';
import { resolveInvoicePayability, getOldestOverdueInvoice } from '@/lib/billing-service';
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

interface AgentBillingSection {
  userAgentId:    string;
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
  periodStart:    string;
  periodEnd:      string;
  setupInvoice:   Invoice | null;
  monthlyInvoice: Invoice | null;
}

interface Props {
  sections:         AgentBillingSection[];
  allInvoices:      Invoice[];
  totalMonthly:     number;
  outstandingSetup: number;
  activeCount:      number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

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

function formatPeriodRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
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
              {formatPeriodRange(invoice.periodStart, invoice.periodEnd)}
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
            {PAYABLE_STATUSES.has(invoice.status) && (
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
          <div className="overflow-x-auto">
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
        </div>
      )}
    </div>
  );
}

// ── Agent Section ──────────────────────────────────────────────────────────────

interface AgentSectionProps {
  section:         AgentBillingSection;
  overdueBlocker:  { id: string } | null;
  onPay:           (invoiceId: string) => void;
  payingInvoiceId: string | null;
}

function AgentSection({ section, overdueBlocker, onPay, payingInvoiceId }: AgentSectionProps) {
  const invoicesToRender: Array<{ label: string; invoice: Invoice }> = [];
  if (section.setupInvoice)   invoicesToRender.push({ label: 'Setup Fee Invoice',  invoice: section.setupInvoice });
  if (section.monthlyInvoice) invoicesToRender.push({ label: 'Monthly Invoice',    invoice: section.monthlyInvoice });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Agent header */}
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-gray-100 bg-gray-50/50">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{section.name}</p>
            <Badge variant={section.isActive ? 'success' : 'neutral'}>
              {section.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {section.phoneNumber && (
            <p className="text-xs text-gray-400 mt-0.5">{section.phoneNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Since {formatDate(section.assignedAt)}
          </span>
          <span className="text-gray-300">·</span>
          <span>{formatPeriodRange(section.periodStart, section.periodEnd)}</span>
        </div>
      </div>

      {/* Invoices + live estimate */}
      <div className="p-4 space-y-3">
        {invoicesToRender.length > 0 ? (
          invoicesToRender.map(({ label, invoice }) => {
            const { canPay: basePay, blockMessage: baseMsg } = resolveInvoicePayability(invoice, overdueBlocker);

            // Pay Now is only available once the billing period has fully elapsed
            const periodComplete = new Date(invoice.periodEnd) <= new Date();
            const canPay = basePay && periodComplete;
            const blockMessage = !periodComplete
              ? `Available after period ends (${new Date(invoice.periodEnd).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })})`
              : baseMsg;

            return (
              <div key={invoice.id}>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
                <InvoiceCard
                  invoice={invoice}
                  canPay={canPay}
                  onPay={() => onPay(invoice.id)}
                  isPaying={payingInvoiceId === invoice.id}
                  blockMessage={blockMessage}
                />
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">
            Invoice will appear automatically
          </p>
        )}

        {/* Live estimate row */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Live Estimate</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {section.costMultiplier != null ? 'Usage charged this period' : 'No usage multiplier'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {formatMoney(
                (section.setupFeePaid ? 0 : (section.setupFee ?? 0)) +
                (section.monthlyFee ?? 0) +
                (section.costMultiplier != null ? section.usageCost : 0)
              )}
            </p>
            {section.setupFee != null && (
              <p className="text-xs mt-0.5">
                {section.setupFeePaid ? (
                  <span className="text-green-600 flex items-center justify-end gap-1">
                    <CheckCircle className="w-3 h-3" /> Setup paid
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> Setup unpaid
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BillingPageClient({
  sections,
  allInvoices,
  totalMonthly,
  outstandingSetup,
  activeCount,
}: Props) {
  const searchParams = useSearchParams();
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const paymentStatus  = searchParams.get('payment');
  const overdueBlocker = getOldestOverdueInvoice(allInvoices);

  const totalOutstanding = allInvoices
    .filter(inv => PAYABLE_STATUSES.has(inv.status))
    .reduce((s, inv) => s + inv.total, 0);

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

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No agents assigned yet. Contact your admin.</p>
      </div>
    );
  }

  const totalUsage = sections.reduce(
    (s, sec) => s + (sec.costMultiplier != null ? sec.usageCost : 0), 0
  );

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
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
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
            <p className="text-xs text-gray-400">of {sections.length} assigned</p>
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

      {/* ── Per-agent billing sections ───────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Agent Billing</h2>
          <p className="text-xs text-gray-400 mt-0.5">Each agent has its own anniversary billing period</p>
        </div>

        {sections.map(section => (
          <AgentSection
            key={section.retellAgentId}
            section={section}
            overdueBlocker={overdueBlocker}
            onPay={handlePay}
            payingInvoiceId={payingInvoiceId}
          />
        ))}
      </div>

      {/* ── Estimated grand total ─────────────────────────────────────────── */}
      <div className="bg-[#004D3E] rounded-xl px-5 py-4 flex items-center justify-between text-white">
        <div>
          <p className="font-semibold">Estimated Total (Current Periods)</p>
          <p className="text-xs text-white/60 mt-0.5">
            Setup fees + monthly fees + live usage across all agents
          </p>
        </div>
        <p className="text-2xl font-bold">
          {formatMoney(outstandingSetup + totalMonthly + totalUsage)}
        </p>
      </div>

    </div>
  );
}
