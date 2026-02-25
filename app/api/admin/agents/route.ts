import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createAgentSchema = z.object({
  retellAgentId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  actualCostRate: z.number().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { assignedUsers: true } },
    },
  });

  return NextResponse.json(agents);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { retellAgentId, name, description, webhookUrl, phoneNumber, actualCostRate, isActive } = parsed.data;

  const existing = await prisma.agent.findUnique({ where: { retellAgentId } });
  if (existing) {
    return NextResponse.json({ error: 'Agent with this Retell ID already exists' }, { status: 409 });
  }

  const agent = await prisma.agent.create({
    data: {
      retellAgentId,
      name,
      description: description || null,
      webhookUrl: webhookUrl || null,
      phoneNumber: phoneNumber || null,
      actualCostRate: actualCostRate ?? null,
      isActive,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
