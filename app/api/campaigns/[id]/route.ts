import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const where = session.user.role === 'ADMIN' ? { id } : { id, userId: session.user.id };

  const campaign = await prisma.campaign.findFirst({
    where,
    include: {
      contactList: { select: { name: true, id: true } },
      outboundCalls: {
        orderBy: { initiatedAt: 'desc' },
        include: {
          contact: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
