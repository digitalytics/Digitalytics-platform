import { prisma } from '@/lib/prisma';
import { AnalyticsPageClient } from '@/components/admin/analytics-page-client';

export default async function AdminAnalyticsPage() {
  // Total stats
  const totalStats = await prisma.call.aggregate({
    _count: { callId: true },
    _sum: { totalCost: true, durationMs: true },
    _avg: { totalCost: true },
  });

  // Cost by agent
  const costByAgentRaw = await prisma.call.groupBy({
    by: ['agentId'],
    where: { totalCost: { not: null } },
    _sum: { totalCost: true },
    _count: { callId: true },
    orderBy: { _sum: { totalCost: 'desc' } },
  });

  // Calls + cost by day (last 30 days)
  const callsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint; cost: string | null }>>`
    SELECT
      TO_CHAR(start_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
      COUNT(*) as count,
      SUM(total_cost)::text as cost
    FROM calls
    WHERE start_timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY TO_CHAR(start_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY date ASC
  `;

  // Enrich with agent names
  const agents = await prisma.agent.findMany({
    select: { retellAgentId: true, name: true },
  });
  const agentMap = Object.fromEntries(agents.map(a => [a.retellAgentId, a.name]));

  const costByAgent = costByAgentRaw.map(a => ({
    agentId: a.agentId,
    agentName: agentMap[a.agentId] || a.agentId.slice(0, 20) + '…',
    totalCost: Number(a._sum.totalCost || 0),
    callCount: a._count.callId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cost Analytics</h1>
        <p className="text-gray-500 mt-1">Actual costs across all agents and calls</p>
      </div>
      <AnalyticsPageClient
        summary={{
          totalCalls: totalStats._count.callId,
          totalCost: Number(totalStats._sum.totalCost || 0),
          avgCostPerCall: Number(totalStats._avg.totalCost || 0),
          totalDurationMs: totalStats._sum.durationMs || 0,
        }}
        costByAgent={costByAgent}
        callsByDay={callsByDay.map(d => ({
          date: d.date,
          count: Number(d.count),
          cost: d.cost ? parseFloat(d.cost) : 0,
        }))}
      />
    </div>
  );
}
