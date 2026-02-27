import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { BillingUserClient } from '@/components/admin/billing-user-client';

export default async function AdminBillingUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard');

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) notFound();

  const invoicesRaw = await prisma.invoice.findMany({
    where: { userId },
    include: { lineItems: true },
    orderBy: { createdAt: 'desc' },
  });

  const invoices = invoicesRaw.map(inv => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    periodStart:   inv.periodStart.toISOString(),
    periodEnd:     inv.periodEnd.toISOString(),
    status:        inv.status as string,
    subtotal:      Number(inv.subtotal),
    total:         Number(inv.total),
    notes:         inv.notes,
    paidAt:        inv.paidAt?.toISOString() ?? null,
    createdAt:     inv.createdAt.toISOString(),
    lineItems: inv.lineItems.map(li => ({
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
        <h1 className="text-2xl font-bold text-gray-900">{user.name || user.email}</h1>
        <p className="text-gray-500 mt-1">{user.email} — Invoice history</p>
      </div>
      <BillingUserClient user={user} invoices={invoices} />
    </div>
  );
}
