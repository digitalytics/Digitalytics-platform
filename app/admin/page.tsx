import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Users, Bot, DollarSign, ArrowRight } from 'lucide-react';
import { StatsCard } from '@/components/ui/stats-card';
import { formatCost } from '@/lib/utils';

export default async function AdminPage() {
  const session = await auth();

  const [userCount, pendingCount, agentCount, callStats] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.agent.count({ where: { isActive: true } }),
    prisma.call.aggregate({
      _count: { callId: true },
      _sum: { totalCost: true },
    }),
  ]);

  const totalCost = callStats._sum.totalCost ? Number(callStats._sum.totalCost) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 mt-1">System-wide metrics and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={userCount} icon="users" iconColor="text-blue-600"
          subtitle={pendingCount > 0 ? `${pendingCount} pending approval` : undefined} />
        <StatsCard title="Active Agents" value={agentCount} icon="bot" iconColor="text-[#004D3E]" />
        <StatsCard title="Total Calls" value={callStats._count.callId.toLocaleString()} icon="phone" iconColor="text-purple-600" />
        <StatsCard title="Total Cost" value={formatCost(totalCost)} icon="dollar-sign" iconColor="text-orange-600" />
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">{pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting approval</p>
            <p className="text-sm text-yellow-600">Review and approve new user registrations</p>
          </div>
          <Link
            href="/admin/users?tab=pending"
            className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium text-sm px-4 py-2 rounded-lg transition"
          >
            Review <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/admin/users', title: 'Manage Users', desc: 'Approve registrations, assign agents, manage roles', Icon: Users },
          { href: '/admin/agents', title: 'Manage Agents', desc: 'Add Retell AI agents, set pricing, control access', Icon: Bot },
          { href: '/admin/analytics', title: 'Cost Analytics', desc: 'View detailed cost breakdown by agent and user', Icon: DollarSign },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#004D3E]/30 hover:shadow-sm transition group"
          >
            <div className="w-10 h-10 bg-[#004D3E]/8 rounded-lg flex items-center justify-center mb-3">
              <item.Icon size={20} className="text-[#004D3E]" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-[#004D3E] transition">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
