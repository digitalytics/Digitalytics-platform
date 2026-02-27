import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingPageClient } from '@/components/admin/billing-page-client';

export default async function AdminBillingPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard');

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedAgents: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id:            true,
          invoiceNumber: true,
          status:        true,
          total:         true,
          createdAt:     true,
        },
      },
      _count: { select: { invoices: true } },
    },
  });

  const outstandingByUser = await prisma.invoice.groupBy({
    by: ['userId'],
    where: { status: { in: ['DRAFT', 'PENDING', 'OVERDUE'] } },
    _sum: { total: true },
  });
  const outstandingMap = Object.fromEntries(
    outstandingByUser.map(r => [r.userId, Number(r._sum.total ?? 0)])
  );

  const serialized = users.map(u => ({
    id:           u.id,
    name:         u.name,
    email:        u.email,
    status:       u.status,
    agentCount:   u.assignedAgents.length,
    invoiceCount: u._count.invoices,
    latestInvoice: u.invoices[0]
      ? {
          id:            u.invoices[0].id,
          invoiceNumber: u.invoices[0].invoiceNumber,
          status:        u.invoices[0].status as string,
          total:         Number(u.invoices[0].total),
          createdAt:     u.invoices[0].createdAt.toISOString(),
        }
      : null,
    totalOutstanding: outstandingMap[u.id] ?? 0,
    monthlyTotal: u.assignedAgents.reduce(
      (sum, ua) => sum + (ua.monthlyFee ? Number(ua.monthlyFee) : 0),
      0
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
        <p className="text-gray-500 mt-1">Generate and manage invoices for all users</p>
      </div>
      <BillingPageClient users={serialized} />
    </div>
  );
}
