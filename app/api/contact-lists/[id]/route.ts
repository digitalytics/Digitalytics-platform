import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({
    where: { id, userId: session.user.id },
    include: {
      members: { select: { contactId: true } },
      _count: { select: { members: true } },
    },
  });

  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    memberCount: list._count.members,
    memberContactIds: list.members.map(m => m.contactId),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({ where: { id, userId: session.user.id } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.contactList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
