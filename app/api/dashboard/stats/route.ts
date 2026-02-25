import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let allowedAgentIds: string[];

  if (session.user.role === 'ADMIN') {
    const agents = await prisma.agent.findMany({ select: { retellAgentId: true } });
    allowedAgentIds = agents.map(a => a.retellAgentId);
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: { select: { retellAgentId: true, isActive: true } } },
    });
    allowedAgentIds = userAgents
      .filter(ua => ua.agent.isActive)
      .map(ua => ua.agent.retellAgentId);
  }

  const where = { agentId: { in: allowedAgentIds } };

  const [totalCalls, successfulCalls, durationAgg, recentCalls] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, callSuccessful: true } }),
    prisma.call.aggregate({
      where: { ...where, durationMs: { not: null } },
      _avg: { durationMs: true },
      _sum: { durationMs: true },
    }),
    prisma.call.findMany({
      where,
      orderBy: { startTimestamp: 'desc' },
      take: 5,
      select: {
        callId: true,
        agentId: true,
        agentName: true,
        callStatus: true,
        startTimestamp: true,
        durationMs: true,
        callSuccessful: true,
        userSentiment: true,
      },
    }),
  ]);

  return NextResponse.json({
    totalCalls,
    successfulCalls,
    successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
    avgDurationMs: Math.round(durationAgg._avg.durationMs || 0),
    totalDurationMs: durationAgg._sum.durationMs || 0,
    recentCalls,
  });
}
