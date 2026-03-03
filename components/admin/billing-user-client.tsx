'use client';

import { useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatMoney, formatCost, formatDate } from '@/lib/utils';

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
  notes:         string | null;
  paidAt:        string | null;
  createdAt:     string;
  lineItems:     LineItem[];
}

interface User {
  id:    string;
  name:  string | null;
  email: string;
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PAID:      'success',
  PENDING:   'warning',
  OVERDUE:   'danger',
  DRAFT:     'neutral',
  CANCELLED: 'neutral',
};

const lineItemLabel: Record<string, string> = {
  SETUP_FEE:   'Setup Fee',
  MONTHLY_FEE: 'Monthly Fee',
  USAGE_FEE:   'Usage Fee',
};

export function BillingUserClient({ user, invoices }: { user: User; invoices: Invoice[] }) {
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/billing"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Billing
      </Link>

      {/* Invoice table — read-only */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No invoices for this user yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Paid At</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatMoney(inv.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[inv.status] ?? 'neutral'}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {inv.paidAt ? formatDate(inv.paidAt) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setViewInvoice(inv)}>
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Line items modal */}
      <Modal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice?.invoiceNumber ?? ''}
        size="md"
      >
        {viewInvoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {formatDate(viewInvoice.periodStart)} – {formatDate(viewInvoice.periodEnd)}
              </span>
              <Badge variant={statusVariant[viewInvoice.status] ?? 'neutral'}>
                {viewInvoice.status}
              </Badge>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Agent</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewInvoice.lineItems.map(li => (
                    <tr key={li.id}>
                      <td className="px-3 py-2.5 text-gray-700">{lineItemLabel[li.type] ?? li.type}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{li.agentName ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">
                        {li.type === 'USAGE_FEE' ? `${li.quantity.toFixed(4)} min` : li.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600">
                        {li.type === 'USAGE_FEE' ? formatCost(li.unitPrice) : formatMoney(li.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                        {formatMoney(li.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatMoney(viewInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatMoney(viewInvoice.total)}</span>
              </div>
              {viewInvoice.paidAt && (
                <p className="text-xs text-green-600 text-right">
                  Paid on {formatDate(viewInvoice.paidAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
