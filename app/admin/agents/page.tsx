import { prisma } from '@/lib/prisma';
import { AgentsPageClient } from '@/components/admin/agents-page-client';

export default async function AdminAgentsPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { assignedUsers: true } },
    },
  });

  const serialized = agents.map(a => ({
    id: a.id,
    retellAgentId: a.retellAgentId,
    name: a.name,
    description: a.description,
    webhookUrl: a.webhookUrl,
    phoneNumber: a.phoneNumber,
    actualCostRate: a.actualCostRate ? Number(a.actualCostRate) : null,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    userCount: a._count.assignedUsers,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
        <p className="text-gray-500 mt-1">Add and manage Retell AI agents</p>
      </div>
      <AgentsPageClient agents={serialized} />
    </div>
  );
}
