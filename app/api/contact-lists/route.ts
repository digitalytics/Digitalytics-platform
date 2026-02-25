import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createListSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lists = await prisma.contactList.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(lists);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const list = await prisma.contactList.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
