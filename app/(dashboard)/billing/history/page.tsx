import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingHistoryClient } from '@/components/dashboard/billing-history-client';
import { autoMarkOverdueForUser } from '@/lib/billing-service';

export default async function BillingHistoryPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;

  // Transition any expired invoices to OVERDUE
  await autoMarkOverdueForUser(userId);

  // Fetch ALL non-cancelled invoices, newest first
  const invoicesRaw = await prisma.invoice.findMany({
    where:   { userId, status: { not: 'CANCELLED' } },
    include: { lineItems: { orderBy: { type: 'asc' } } },
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
  });

  const invoices = invoicesRaw.map(inv => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    periodStart:   inv.periodStart.toISOString(),
    periodEnd:     inv.periodEnd.toISOString(),
    status:        inv.status as string,
    subtotal:      Number(inv.subtotal),
    total:         Number(inv.total),
    paidAt:        inv.paidAt?.toISOString() ?? null,
    createdAt:     inv.createdAt.toISOString(),
    lineItems:     inv.lineItems.map(li => ({
      id:          li.id,
      type:        li.type as string,
      agentId:     li.agentId,
      agentName:   li.agentName,
      description: li.description,
      quantity:    Number(li.quantity),
      unitPrice:   Number(li.unitPrice),
      total:       Number(li.total),
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
        <p className="text-gray-500 mt-1">All your invoices across every billing period</p>
      </div>
      <BillingHistoryClient invoices={invoices} />
    </div>
  );
}
