import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingPageClient } from '@/components/dashboard/billing-page-client';
import { ensureBillingUpToDateForUser } from '@/lib/billing-service';
import { computeAgentBillingPeriod } from '@/lib/billing-engine';
import { stripe } from '@/lib/stripe';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const userId = session.user.id;
  const { payment } = await searchParams;

  // Reset any PENDING invoices whose Stripe session was abandoned (back button or cancel).
  // Stripe only fires checkout.session.expired after ~30 min, so we check proactively.
  const pendingInvoices = await prisma.invoice.findMany({
    where:  { userId, status: 'PENDING' },
    select: { id: true, stripeCheckoutSessionId: true },
  });
  for (const inv of pendingInvoices) {
    let shouldReset = payment === 'cancelled';
    if (!shouldReset && inv.stripeCheckoutSessionId) {
      try {
        const stripeSession = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
        if (stripeSession.status !== 'open') shouldReset = true;
      } catch {
        shouldReset = true;
      }
    }
    if (shouldReset) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data:  { status: 'DRAFT', stripeCheckoutSessionId: null },
      });
    }
  }

  // Auto-generate per-agent monthly invoices + mark overdue
  await ensureBillingUpToDateForUser(userId);

  const now = new Date();

  // Fetch agent assignments with invoices
  const userAgentsRaw = await prisma.userAgent.findMany({
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
      invoices: {
        where:   { status: { not: 'CANCELLED' } },
        include: { lineItems: { orderBy: { type: 'asc' } } },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });

  // Helper: serialize an invoice for the client
  function serializeInvoice(inv: typeof userAgentsRaw[0]['invoices'][0]) {
    return {
      id:            inv.id,
      invoiceNumber: inv.invoiceNumber,
      periodStart:   inv.periodStart.toISOString(),
      periodEnd:     inv.periodEnd.toISOString(),
      status:        inv.status as string,
      subtotal:      Number(inv.subtotal),
      total:         Number(inv.total),
      paidAt:        inv.paidAt?.toISOString() ?? null,
      createdAt:     inv.createdAt.toISOString(),
      lineItems:     inv.lineItems.map(li => ({
        id:          li.id,
        type:        li.type as string,
        agentId:     li.agentId,
        agentName:   li.agentName,
        description: li.description,
        quantity:    Number(li.quantity),
        unitPrice:   Number(li.unitPrice),
        total:       Number(li.total),
      })),
    };
  }

  // Build per-agent billing sections
  const sections = await Promise.all(
    userAgentsRaw.map(async ua => {
      const { periodStart, periodEnd } = computeAgentBillingPeriod(ua.assignedAt, now);

      // Live usage for estimate
      let retellCost = 0;
      let usageCost  = 0;
      if (ua.costMultiplier) {
        const agg = await prisma.call.aggregate({
          where: {
            agentId:        ua.agent.retellAgentId,
            startTimestamp: { gte: periodStart, lte: periodEnd },
            totalCost:      { not: null },
          },
          _sum: { totalCost: true },
        });
        retellCost = Number(agg._sum.totalCost ?? 0);
        usageCost  = Math.round(retellCost * Number(ua.costMultiplier) * 100) / 100;
      }

      // Find invoices for this agent in the current period
      const setupInvoice = ua.invoices.find(inv =>
        (inv.invoiceType as string) === 'SETUP'
      ) ?? null;
      const monthlyInvoice = ua.invoices.find(inv =>
        (inv.invoiceType as string) === 'MONTHLY' &&
        inv.periodStart.getTime() === periodStart.getTime()
      ) ?? null;

      return {
        userAgentId:    ua.id,
        retellAgentId:  ua.agent.retellAgentId,
        name:           ua.agent.name,
        isActive:       ua.agent.isActive,
        phoneNumber:    ua.agent.phoneNumber,
        assignedAt:     ua.assignedAt.toISOString(),
        setupFee:       ua.setupFee       ? Number(ua.setupFee)       : null,
        setupFeePaid:   ua.setupFeePaid,
        monthlyFee:     ua.monthlyFee     ? Number(ua.monthlyFee)     : null,
        costMultiplier: ua.costMultiplier ? Number(ua.costMultiplier) : null,
        retellCost,
        usageCost,
        periodStart:    periodStart.toISOString(),
        periodEnd:      periodEnd.toISOString(),
        setupInvoice:   setupInvoice   ? serializeInvoice(setupInvoice)   : null,
        monthlyInvoice: monthlyInvoice ? serializeInvoice(monthlyInvoice) : null,
      };
    })
  );

  // Flat invoice list for overdue blocker + outstanding calculation
  const allInvoices = sections.flatMap(s =>
    [s.setupInvoice, s.monthlyInvoice].filter((inv): inv is NonNullable<typeof inv> => inv != null)
  );

  const totalMonthly     = sections.reduce((sum, s) => sum + (s.monthlyFee ?? 0), 0);
  const outstandingSetup = sections
    .filter(s => !s.setupFeePaid)
    .reduce((sum, s) => sum + (s.setupFee ?? 0), 0);
  const activeCount = sections.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Current Bill</h1>
        <p className="text-gray-500 mt-1">Per-agent invoices and live cost breakdown</p>
      </div>
      <BillingPageClient
        sections={sections}
        allInvoices={allInvoices}
        totalMonthly={totalMonthly}
        outstandingSetup={outstandingSetup}
        activeCount={activeCount}
      />
    </div>
  );
}
