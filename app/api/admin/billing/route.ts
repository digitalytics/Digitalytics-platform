import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  // Outstanding = sum of totals for DRAFT + PENDING + OVERDUE invoices
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
          status:        u.invoices[0].status,
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

  return NextResponse.json(serialized);
}
