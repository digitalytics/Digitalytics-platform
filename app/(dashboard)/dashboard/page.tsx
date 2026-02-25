import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AgentCards } from '@/components/dashboard/agent-cards';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentCallsTable } from '@/components/dashboard/recent-calls-table';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Fetch assigned agents
  let agentIds: string[];
  let agents: Array<{ id: string; retellAgentId: string; name: string; description: string | null; isActive: boolean; phoneNumber: string | null }>;

  if (session.user.role === 'ADMIN') {
    agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    agentIds = agents.map(a => a.retellAgentId);
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: true },
    });
    agents = userAgents.map(ua => ua.agent);
    agentIds = agents.filter(a => a.isActive).map(a => a.retellAgentId);
  }

  const where = agentIds.length > 0 ? { agentId: { in: agentIds } } : { agentId: '' };

  // Stats
  const [totalCalls, successfulCalls, durationAgg, recentCalls] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, callSuccessful: true } }),
    prisma.call.aggregate({
      where: { ...where, durationMs: { not: null } },
      _avg: { durationMs: true },
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

  // Per-agent call counts
  const agentCallCounts = await prisma.call.groupBy({
    by: ['agentId'],
    where,
    _count: { callId: true },
    _max: { startTimestamp: true },
  });

  const agentStats = agents.map(agent => ({
    id: agent.id,
    retellAgentId: agent.retellAgentId,
    name: agent.name,
    description: agent.description,
    isActive: agent.isActive,
    phoneNumber: agent.phoneNumber ?? null,
    callCount: agentCallCounts.find(a => a.agentId === agent.retellAgentId)?._count.callId || 0,
    lastCallAt: agentCallCounts.find(a => a.agentId === agent.retellAgentId)?._max.startTimestamp || null,
  }));

  const stats = {
    totalCalls,
    successfulCalls,
    successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
    avgDurationMs: Math.round(durationAgg._avg.durationMs || 0),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your AI agents</p>
      </div>

      <DashboardStats stats={stats} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Agents</h2>
        {agentStats.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No agents assigned yet. Contact your admin.</p>
          </div>
        ) : (
          <AgentCards agents={agentStats} />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          <a href="/calls" className="text-sm text-[#004D3E] hover:underline font-medium">
            View all →
          </a>
        </div>
        <RecentCallsTable calls={recentCalls} />
      </div>
    </div>
  );
}
