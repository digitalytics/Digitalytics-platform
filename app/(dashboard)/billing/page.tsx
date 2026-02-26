import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingPageClient } from '@/components/dashboard/billing-page-client';

export default async function BillingPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userAgents = await prisma.userAgent.findMany({
    where: { userId: session.user.id },
    include: {
      agent: {
        select: {
          retellAgentId: true,
          name: true,
          isActive: true,
          phoneNumber: true,
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  const agents = userAgents.map(ua => ({
    retellAgentId: ua.agent.retellAgentId,
    name:          ua.agent.name,
    isActive:      ua.agent.isActive,
    phoneNumber:   ua.agent.phoneNumber,
    assignedAt:    ua.assignedAt.toISOString(),
    setupFee:      ua.setupFee     ? Number(ua.setupFee)    : null,
    setupFeePaid:  ua.setupFeePaid,
    monthlyFee:    ua.monthlyFee   ? Number(ua.monthlyFee)  : null,
    customPrice:   ua.customPrice  ? Number(ua.customPrice) : null,
  }));

  const totalMonthly     = agents.reduce((sum, a) => sum + (a.monthlyFee ?? 0), 0);
  const outstandingSetup = agents
    .filter(a => !a.setupFeePaid)
    .reduce((sum, a) => sum + (a.setupFee ?? 0), 0);
  const activeCount = agents.filter(a => a.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Cost breakdown for your assigned agents</p>
      </div>
      <BillingPageClient
        agents={agents}
        totalMonthly={totalMonthly}
        outstandingSetup={outstandingSetup}
        activeCount={activeCount}
      />
    </div>
  );
}
