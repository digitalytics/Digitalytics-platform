import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    include: { lineItems: true },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = invoices.map(inv => ({
    id:             inv.id,
    invoiceNumber:  inv.invoiceNumber,
    periodStart:    inv.periodStart.toISOString(),
    periodEnd:      inv.periodEnd.toISOString(),
    status:         inv.status,
    subtotal:       Number(inv.subtotal),
    total:          Number(inv.total),
    notes:          inv.notes,
    paidAt:         inv.paidAt?.toISOString() ?? null,
    createdAt:      inv.createdAt.toISOString(),
    lineItems: inv.lineItems.map(li => ({
      id:          li.id,
      type:        li.type,
      agentId:     li.agentId,
      agentName:   li.agentName,
      description: li.description,
      quantity:    Number(li.quantity),
      unitPrice:   Number(li.unitPrice),
      total:       Number(li.total),
    })),
  }));

  return NextResponse.json(serialized);
}
