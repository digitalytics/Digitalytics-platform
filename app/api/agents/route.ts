import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin sees all agents
  if (session.user.role === 'ADMIN') {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { assignedUsers: true } },
      },
    });
    return NextResponse.json(agents);
  }

  // Users see only their assigned agents
  const userAgents = await prisma.userAgent.findMany({
    where: { userId: session.user.id },
    include: {
      agent: true,
    },
    orderBy: { assignedAt: 'desc' },
  });

  return NextResponse.json(userAgents.map(ua => ua.agent));
}
