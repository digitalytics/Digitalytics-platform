import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CallsPageClient } from '@/components/dashboard/calls-page-client';

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = 20;
  const agentId = params.agentId;
  const status = params.status;
  const outcome = params.outcome;

  // Get accessible agent IDs
  let allowedAgentIds: string[];
  let assignedAgents: Array<{ retellAgentId: string; name: string }>;

  if (session.user.role === 'ADMIN') {
    const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    assignedAgents = agents;
    allowedAgentIds = agents.map(a => a.retellAgentId);
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: { select: { retellAgentId: true, name: true, isActive: true } } },
    });
    assignedAgents = userAgents.filter(ua => ua.agent.isActive).map(ua => ua.agent);
    allowedAgentIds = assignedAgents.map(a => a.retellAgentId);
  }

  const filteredIds = agentId && allowedAgentIds.includes(agentId)
    ? [agentId]
    : allowedAgentIds;

  const where: Record<string, unknown> = {
    agentId: { in: filteredIds },
  };
  if (status) where.callStatus = status;
  if (outcome === 'true') where.callSuccessful = true;
  if (outcome === 'false') where.callSuccessful = false;

  const offset = (page - 1) * limit;

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
      },
    }),
    prisma.call.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
        <p className="text-gray-500 mt-1">
          {total.toLocaleString()} total calls
        </p>
      </div>

      <CallsPageClient
        initialCalls={calls as any}
        totalCalls={total}
        page={page}
        limit={limit}
        agents={assignedAgents}
        filters={{ agentId, status, outcome }}
      />
    </div>
  );
}
