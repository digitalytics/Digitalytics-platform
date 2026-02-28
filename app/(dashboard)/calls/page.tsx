import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CallsPageClient } from '@/components/dashboard/calls-page-client';
import { computeUserCost, totalCostFromDetails } from '@/lib/call-cost-utils';

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
  let assignedAgents: Array<{ retellAgentId: string; name: string }>;
  let costMultiplierMap: Record<string, number | null> = {};

  // Build the call filter where clause
  let callWhere: Record<string, unknown>;

  if (session.user.role === 'ADMIN') {
    const agents = await prisma.agent.findMany({ orderBy: { name: 'asc' } });
    assignedAgents = agents;
    const allowedAgentIds = agents.map(a => a.retellAgentId);

    const filteredIds = agentId && allowedAgentIds.includes(agentId)
      ? [agentId]
      : allowedAgentIds;

    callWhere = { agentId: { in: filteredIds } };
  } else {
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: { select: { retellAgentId: true, name: true, isActive: true } } },
    });
    assignedAgents = userAgents.filter(ua => ua.agent.isActive).map(ua => ua.agent);
    costMultiplierMap = Object.fromEntries(
      userAgents.map(ua => [ua.agent.retellAgentId, ua.costMultiplier ? Number(ua.costMultiplier) : null])
    );

    if (agentId) {
      // Single agent filter: apply that agent's assignedAt
      const targetUa = userAgents.find(ua => ua.agent.retellAgentId === agentId);
      if (targetUa) {
        callWhere = {
          agentId,
          startTimestamp: { gte: targetUa.assignedAt },
        };
      } else {
        // Agent not accessible — return empty results
        callWhere = { agentId: '' };
      }
    } else {
      // All accessible agents with per-agent assignedAt filters
      const activeUserAgents = userAgents.filter(ua => ua.agent.isActive);
      if (activeUserAgents.length === 0) {
        callWhere = { agentId: '' };
      } else {
        callWhere = {
          OR: activeUserAgents.map(ua => ({
            agentId: ua.agent.retellAgentId,
            startTimestamp: { gte: ua.assignedAt },
          })),
        };
      }
    }
  }

  if (status) callWhere.callStatus = status;
  if (outcome === 'true') callWhere.callSuccessful = true;
  if (outcome === 'false') callWhere.callSuccessful = false;

  const offset = (page - 1) * limit;

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where: callWhere,
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
        totalCost: true,
        costDetails: true,
      },
    }),
    prisma.call.count({ where: callWhere }),
  ]);

  const callsWithCost = calls.map(c => ({
    callId:         c.callId,
    agentId:        c.agentId,
    agentName:      c.agentName,
    callStatus:     c.callStatus,
    startTimestamp: c.startTimestamp.toISOString(),
    durationMs:     c.durationMs,
    callSuccessful: c.callSuccessful,
    userSentiment:  c.userSentiment,
    userCost: computeUserCost(
      c.totalCost
        ? Number(c.totalCost)
        : totalCostFromDetails(c.costDetails as { combined_cost?: number } | null),
      costMultiplierMap[c.agentId],
    ),
    costDetails: c.costDetails ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
        <p className="text-gray-500 mt-1">
          {total.toLocaleString()} total calls
        </p>
      </div>

      <CallsPageClient
        initialCalls={callsWithCost}
        totalCalls={total}
        page={page}
        limit={limit}
        agents={assignedAgents}
        filters={{ agentId, status, outcome }}
      />
    </div>
  );
}
