import { prisma } from '@/lib/prisma';
import { UsersPageClient } from '@/components/admin/users-page-client';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'all';

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignedAgents: {
        include: { agent: { select: { name: true, retellAgentId: true } } },
      },
    },
  });

  const agentsRaw = await prisma.agent.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const agents = agentsRaw.map(a => ({
    ...a,
    actualCostRate: a.actualCostRate ? Number(a.actualCostRate) : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  const serialized = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    agents: u.assignedAgents.map(ua => ({
      name: ua.agent.name,
      retellAgentId: ua.agent.retellAgentId,
      customPrice: ua.customPrice ? Number(ua.customPrice) : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Approve registrations and manage user access</p>
      </div>
      <UsersPageClient users={serialized} agents={agents} initialTab={tab} />
    </div>
  );
}
