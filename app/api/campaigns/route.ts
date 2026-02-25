import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  agentId: z.string().min(1, 'Agent is required'),
  contactListId: z.string().min(1, 'Contact list is required'),
  scheduledAt: z.string().datetime().optional(),
  concurrency: z.number().int().min(1).max(10).default(1),
  delaySeconds: z.number().int().min(0).max(300).default(5),
  dynamicVariables: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        contactList: { select: { name: true } },
        _count: { select: { outboundCalls: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({ campaigns, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, description, agentId, contactListId, scheduledAt, concurrency, delaySeconds, dynamicVariables } =
    parsed.data;

  // Verify contact list belongs to user
  const contactList = await prisma.contactList.findFirst({
    where: { id: contactListId, userId: session.user.id },
    include: { _count: { select: { members: true } } },
  });
  if (!contactList) {
    return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
  }

  // Verify agent assignment
  let agent;
  if (session.user.role === 'ADMIN') {
    agent = await prisma.agent.findUnique({ where: { id: agentId } });
  } else {
    const assignment = await prisma.userAgent.findFirst({
      where: { userId: session.user.id, agentId },
      include: { agent: true },
    });
    agent = assignment?.agent;
  }
  if (!agent) return NextResponse.json({ error: 'Agent not found or not assigned' }, { status: 404 });

  const campaign = await prisma.campaign.create({
    data: {
      userId: session.user.id,
      name,
      description: description || null,
      agentId,
      contactListId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      concurrency,
      delaySeconds,
      totalContacts: contactList._count.members,
      dynamicVariables: dynamicVariables ? (dynamicVariables as Prisma.InputJsonValue) : undefined,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
