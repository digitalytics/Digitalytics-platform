import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { RecentCallsTable } from '@/components/dashboard/recent-calls-table';
import { Badge } from '@/components/ui/badge';
import { Activity, Phone, DollarSign, PhoneCall, PhoneOff, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDuration, formatDate } from '@/lib/utils';
import { CopyButton } from '@/components/dashboard/copy-button';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const { agentId } = await params;
  const isAdmin = session.user.role === 'ADMIN';

  let agent: {
    id: string;
    retellAgentId: string;
    name: string;
    description: string | null;
    isActive: boolean;
    phoneNumber: string | null;
  };
  let assignedAt: Date | null = null;
  let customPrice: number | null = null;

  if (isAdmin) {
    const found = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!found) notFound();
    agent = found;
  } else {
    const userAgent = await prisma.userAgent.findFirst({
      where: { userId: session.user.id, agentId },
      include: { agent: true },
    });
    if (!userAgent) notFound();
    agent = userAgent.agent;
    assignedAt = userAgent.assignedAt;
    customPrice = userAgent.customPrice ? Number(userAgent.customPrice) : null;
  }

  const callWhere = assignedAt
    ? { agentId: agent.retellAgentId, startTimestamp: { gte: assignedAt } }
    : { agentId: agent.retellAgentId };

  const [totalCalls, connectedCalls, failedCalls, durationAgg, recentCalls] = await Promise.all([
    prisma.call.count({ where: callWhere }),
    prisma.call.count({ where: { ...callWhere, callSuccessful: true } }),
    prisma.call.count({ where: { ...callWhere, callSuccessful: false } }),
    prisma.call.aggregate({
      where: { ...callWhere, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
    prisma.call.findMany({
      where: callWhere,
      orderBy: { startTimestamp: 'desc' },
      take: 10,
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

  const avgDurationMs = Math.round(durationAgg._avg.durationMs || 0);

  const statCards = [
    {
      label: 'Total Calls',
      value: totalCalls.toLocaleString(),
      icon: PhoneCall,
      color: 'text-[#004D3E]',
      bg: 'bg-[#004D3E]/10',
    },
    {
      label: 'Connected',
      value: connectedCalls.toLocaleString(),
      icon: PhoneCall,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Failed',
      value: failedCalls.toLocaleString(),
      icon: PhoneOff,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Avg Duration',
      value: formatDuration(avgDurationMs),
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#004D3E]/10 flex items-center justify-center flex-shrink-0">
              <Activity size={24} className="text-[#004D3E]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
                <Badge variant={agent.isActive ? 'success' : 'neutral'}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {agent.description && (
                <p className="text-gray-500 text-sm max-w-xl">{agent.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-gray-100">
          {agent.phoneNumber && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
              <Phone size={13} className="text-[#004D3E]" />
              <span className="font-mono">{agent.phoneNumber}</span>
              <CopyButton text={agent.phoneNumber} />
            </div>
          )}
          {customPrice !== null && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
              <DollarSign size={13} className="text-[#004D3E]" />
              <span>
                <span className="font-medium">${customPrice.toFixed(4)}</span>
                <span className="text-gray-400 ml-1">/ min (your rate)</span>
              </span>
            </div>
          )}
          {assignedAt && (
            <div className="text-sm text-gray-400">
              Assigned {formatDate(assignedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent calls */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
          <Link
            href={`/calls?agentId=${agent.retellAgentId}`}
            className="text-sm text-[#004D3E] hover:underline font-medium"
          >
            View all →
          </Link>
        </div>
        <RecentCallsTable calls={recentCalls} />
      </div>
    </div>
  );
}
