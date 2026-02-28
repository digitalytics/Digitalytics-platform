import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingPageClient } from '@/components/dashboard/billing-page-client';
import { autoMarkOverdueForUser } from '@/lib/billing-service';

export default async function BillingPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;

  // Automatically transition any unpaid invoices whose period has closed → OVERDUE
  // (runs silently on every page load, no admin needed)
  await autoMarkOverdueForUser(userId);

  // Fetch agent assignments for the live cost breakdown
  const userAgents = await prisma.userAgent.findMany({
    where:   { userId },
    include: {
      agent: {
        select: {
          retellAgentId: true,
          name:          true,
          isActive:      true,
          phoneNumber:   true,
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  // Current month period
  const now         = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Live usage per agent
  const usageByAgent = await Promise.all(
    userAgents.map(async ua => {
      if (!ua.costMultiplier) return { retellAgentId: ua.agent.retellAgentId, retellCost: 0, cost: 0 };
      const agg = await prisma.call.aggregate({
        where: {
          agentId:        ua.agent.retellAgentId,
          startTimestamp: { gte: ua.assignedAt > periodStart ? ua.assignedAt : periodStart, lte: periodEnd },
          totalCost:      { not: null },
        },
        _sum: { totalCost: true },
      });
      const retellCost = Number(agg._sum.totalCost ?? 0);
      const cost       = Math.round(retellCost * Number(ua.costMultiplier) * 100) / 100;
      return { retellAgentId: ua.agent.retellAgentId, retellCost, cost };
    })
  );
  const usageMap = Object.fromEntries(usageByAgent.map(u => [u.retellAgentId, u]));

  const agents = userAgents.map(ua => ({
    retellAgentId:  ua.agent.retellAgentId,
    name:           ua.agent.name,
    isActive:       ua.agent.isActive,
    phoneNumber:    ua.agent.phoneNumber,
    assignedAt:     ua.assignedAt.toISOString(),
    setupFee:       ua.setupFee       ? Number(ua.setupFee)       : null,
    setupFeePaid:   ua.setupFeePaid,
    monthlyFee:     ua.monthlyFee     ? Number(ua.monthlyFee)     : null,
    costMultiplier: ua.costMultiplier ? Number(ua.costMultiplier) : null,
    retellCost:     usageMap[ua.agent.retellAgentId]?.retellCost ?? 0,
    usageCost:      usageMap[ua.agent.retellAgentId]?.cost       ?? 0,
  }));

  // Fetch all non-cancelled invoices, newest first
  const invoicesRaw = await prisma.invoice.findMany({
    where:   { userId, status: { not: 'CANCELLED' } },
    include: { lineItems: { orderBy: { type: 'asc' } } },
    orderBy: { periodStart: 'desc' },
  });

  const invoices = invoicesRaw.map(inv => ({
    id:            inv.id,
    invoiceNumber: inv.invoiceNumber,
    periodStart:   inv.periodStart.toISOString(),
    periodEnd:     inv.periodEnd.toISOString(),
    status:        inv.status as string,
    subtotal:      Number(inv.subtotal),
    total:         Number(inv.total),
    paidAt:        inv.paidAt?.toISOString() ?? null,
    createdAt:     inv.createdAt.toISOString(),
    lineItems: inv.lineItems.map(li => ({
      id:          li.id,
      type:        li.type as string,
      agentId:     li.agentId,
      agentName:   li.agentName,
      description: li.description,
      quantity:    Number(li.quantity),
      unitPrice:   Number(li.unitPrice),
      total:       Number(li.total),
    })),
  }));

  const totalMonthly     = agents.reduce((sum, a) => sum + (a.monthlyFee ?? 0), 0);
  const outstandingSetup = agents
    .filter(a => !a.setupFeePaid)
    .reduce((sum, a) => sum + (a.setupFee ?? 0), 0);
  const activeCount = agents.filter(a => a.isActive).length;

  // Does a current-month invoice already exist?
  // Use date-range check instead of string prefix to avoid UTC/local-time mismatch.
  const hasCurrentInvoice = invoices.some(inv =>
    new Date(inv.periodStart) <= now && now <= new Date(inv.periodEnd)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Your invoices and cost breakdown</p>
      </div>
      <BillingPageClient
        agents={agents}
        invoices={invoices}
        hasCurrentInvoice={hasCurrentInvoice}
        totalMonthly={totalMonthly}
        outstandingSetup={outstandingSetup}
        activeCount={activeCount}
      />
    </div>
  );
}
