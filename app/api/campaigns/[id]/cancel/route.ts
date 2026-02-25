import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const where = session.user.role === 'ADMIN' ? { id } : { id, userId: session.user.id };

  const campaign = await prisma.campaign.findFirst({ where });
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign is already finished' }, { status: 400 });
  }

  // Cancel any pending outbound calls for this campaign
  await prisma.outboundCall.updateMany({
    where: { campaignId: id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });

  return NextResponse.json(updated);
}
