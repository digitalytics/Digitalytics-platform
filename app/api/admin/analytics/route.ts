import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const where: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    where.startTimestamp = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [totalStats, costByAgent, callsByDay] = await Promise.all([
    prisma.call.aggregate({
      where,
      _count: { callId: true },
      _sum: { totalCost: true, durationMs: true },
      _avg: { totalCost: true },
    }),

    // Cost and call count by agent
    prisma.call.groupBy({
      by: ['agentId'],
      where: { ...where, totalCost: { not: null } },
      _sum: { totalCost: true },
      _count: { callId: true },
      orderBy: { _sum: { totalCost: 'desc' } },
    }),

    // Calls per day (last 30 days)
    prisma.$queryRaw<Array<{ date: string; count: bigint; cost: number | null }>>`
      SELECT
        DATE(start_timestamp) as date,
        COUNT(*) as count,
        SUM(total_cost) as cost
      FROM calls
      WHERE start_timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(start_timestamp)
      ORDER BY date ASC
    `,
  ]);

  // Enrich cost by agent with agent names
  const agentIds = costByAgent.map(a => a.agentId);
  const agents = await prisma.agent.findMany({
    where: { retellAgentId: { in: agentIds } },
    select: { retellAgentId: true, name: true },
  });

  const agentMap = Object.fromEntries(agents.map(a => [a.retellAgentId, a.name]));

  return NextResponse.json({
    summary: {
      totalCalls: totalStats._count.callId,
      totalCost: totalStats._sum.totalCost ? Number(totalStats._sum.totalCost) : 0,
      avgCostPerCall: totalStats._avg.totalCost ? Number(totalStats._avg.totalCost) : 0,
      totalDurationMs: totalStats._sum.durationMs || 0,
    },
    costByAgent: costByAgent.map(a => ({
      agentId: a.agentId,
      agentName: agentMap[a.agentId] || a.agentId,
      totalCost: Number(a._sum.totalCost || 0),
      callCount: a._count.callId,
    })),
    callsByDay: callsByDay.map(d => ({
      date: d.date,
      count: Number(d.count),
      cost: d.cost ? Number(d.cost) : 0,
    })),
  });
}
