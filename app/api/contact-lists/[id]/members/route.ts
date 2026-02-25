import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addMembersSchema = z.object({
  contactIds: z.array(z.string()).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({ where: { id, userId: session.user.id } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const parsed = addMembersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  await prisma.contactListMember.createMany({
    data: parsed.data.contactIds.map(contactId => ({
      contactListId: id,
      contactId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const list = await prisma.contactList.findFirst({ where: { id, userId: session.user.id } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { contactIds } = body as { contactIds: string[] };

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: 'contactIds required' }, { status: 400 });
  }

  await prisma.contactListMember.deleteMany({
    where: { contactListId: id, contactId: { in: contactIds } },
  });

  return NextResponse.json({ success: true });
}
