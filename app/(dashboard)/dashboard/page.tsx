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
  let agents: Array<{
    id: string;
    retellAgentId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    phoneNumber: string | null;
  }>;

  // For non-admin users, store assignedAt + customPrice per agent
  type UserAgentMeta = { retellAgentId: string; assignedAt: Date; customPrice: number | null };
  let userAgentMeta: UserAgentMeta[] = [];

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
    userAgentMeta = userAgents.map(ua => ({
      retellAgentId: ua.agent.retellAgentId,
      assignedAt: ua.assignedAt,
      customPrice: ua.customPrice ? Number(ua.customPrice) : null,
    }));
  }

  // Build the call filter — admins see all, users see only post-assignment calls
  // This must match the calls page filter exactly so counts are consistent.
  let callsWhere: Record<string, unknown>;
  if (session.user.role === 'ADMIN') {
    callsWhere = agentIds.length > 0 ? { agentId: { in: agentIds } } : { agentId: '' };
  } else {
    const activeUserAgentMeta = userAgentMeta.filter(m =>
      agents.find(a => a.retellAgentId === m.retellAgentId && a.isActive)
    );
    callsWhere = activeUserAgentMeta.length > 0
      ? {
          OR: activeUserAgentMeta.map(m => ({
            agentId: m.retellAgentId,
            startTimestamp: { gte: m.assignedAt },
          })),
        }
      : { agentId: '' };
  }

  // Stats
  const [totalCalls, successfulCalls, durationAgg, recentCalls] = await Promise.all([
    prisma.call.count({ where: callsWhere }),
    prisma.call.count({ where: { ...callsWhere, callSuccessful: true } }),
    prisma.call.aggregate({
      where: { ...callsWhere, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
    prisma.call.findMany({
      where: callsWhere,
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

  // Per-agent call counts — filter by assignedAt for non-admin users
  let agentStats: Array<{
    id: string;
    retellAgentId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    phoneNumber: string | null;
    callCount: number;
    lastCallAt: Date | null;
    customPrice: number | null;
  }>;

  if (session.user.role === 'ADMIN') {
    const agentCallCounts = await prisma.call.groupBy({
      by: ['agentId'],
      where: callsWhere,
      _count: { callId: true },
      _max: { startTimestamp: true },
    });

    agentStats = agents.map(agent => ({
      id: agent.id,
      retellAgentId: agent.retellAgentId,
      name: agent.name,
      description: agent.description,
      isActive: agent.isActive,
      phoneNumber: agent.phoneNumber ?? null,
      callCount: agentCallCounts.find(a => a.agentId === agent.retellAgentId)?._count.callId || 0,
      lastCallAt: agentCallCounts.find(a => a.agentId === agent.retellAgentId)?._max.startTimestamp || null,
      customPrice: null,
    }));
  } else {
    // Per-agent queries with assignedAt filter
    const perAgentCounts = await Promise.all(
      userAgentMeta.map(async meta => {
        const agentWhere = {
          agentId: meta.retellAgentId,
          startTimestamp: { gte: meta.assignedAt },
        };
        const [count, lastCall] = await Promise.all([
          prisma.call.count({ where: agentWhere }),
          prisma.call.findFirst({
            where: agentWhere,
            orderBy: { startTimestamp: 'desc' },
            select: { startTimestamp: true },
          }),
        ]);
        return { retellAgentId: meta.retellAgentId, count, lastCallAt: lastCall?.startTimestamp ?? null };
      })
    );

    agentStats = agents.map(agent => {
      const meta = userAgentMeta.find(m => m.retellAgentId === agent.retellAgentId);
      const counts = perAgentCounts.find(c => c.retellAgentId === agent.retellAgentId);
      return {
        id: agent.id,
        retellAgentId: agent.retellAgentId,
        name: agent.name,
        description: agent.description,
        isActive: agent.isActive,
        phoneNumber: agent.phoneNumber ?? null,
        callCount: counts?.count ?? 0,
        lastCallAt: counts?.lastCallAt ?? null,
        customPrice: meta?.customPrice ?? null,
      };
    });
  }

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
