import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const agentId = searchParams.get('agentId') || undefined;
  const status = searchParams.get('status') || undefined;
  const outcome = searchParams.get('outcome'); // 'true' | 'false'
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;

  const offset = (page - 1) * limit;

  // Determine which agent IDs the user can access
  let allowedAgentIds: string[];

  if (session.user.role === 'ADMIN') {
    // Admin can see all (but can filter by agentId)
    if (agentId) {
      allowedAgentIds = [agentId];
    } else {
      const agents = await prisma.agent.findMany({ select: { retellAgentId: true } });
      allowedAgentIds = agents.map(a => a.retellAgentId);
    }
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: { select: { retellAgentId: true, isActive: true } } },
    });
    allowedAgentIds = userAgents
      .filter(ua => ua.agent.isActive)
      .map(ua => ua.agent.retellAgentId);

    if (agentId && !allowedAgentIds.includes(agentId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (agentId) allowedAgentIds = [agentId];
  }

  const where: Record<string, unknown> = {
    agentId: { in: allowedAgentIds },
  };

  if (status) where.callStatus = status;
  if (outcome !== null && outcome !== undefined) {
    where.callSuccessful = outcome === 'true';
  }
  if (dateFrom || dateTo) {
    where.startTimestamp = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: { startTimestamp: 'desc' },
      skip: offset,
      take: limit,
      select: {
        callId: true,
        agentId: true,
        agentName: true,
        callStatus: true,
        startTimestamp: true,
        endTimestamp: true,
        durationMs: true,
        callSuccessful: true,
        userSentiment: true,
        // Explicitly exclude totalCost, costDetails, latencyDetails for user routes
        // (admin can get them via admin API)
      },
    }),
    prisma.call.count({ where }),
  ]);

  return NextResponse.json({
    calls,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
