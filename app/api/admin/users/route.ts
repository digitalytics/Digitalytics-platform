import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  const users = await prisma.user.findMany({
    where: status ? { status: status as 'PENDING' | 'ACTIVE' | 'INACTIVE' } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      assignedAgents: {
        include: { agent: { select: { name: true, retellAgentId: true } } },
      },
    },
  });

  return NextResponse.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    agentCount: u.assignedAgents.length,
    agents: u.assignedAgents.map(ua => ({ name: ua.agent.name, agentId: ua.agent.retellAgentId, costMultiplier: ua.costMultiplier })),
  })));
}
