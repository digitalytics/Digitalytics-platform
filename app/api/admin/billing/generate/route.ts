import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildLineItems, computeSubtotal, generateInvoiceNumber } from '@/lib/billing-engine';

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Current billing period: first → last day of current month
  const now         = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // All active non-admin users with their agent assignments
  const users = await prisma.user.findMany({
    where:   { role: 'USER', status: 'ACTIVE' },
    include: { assignedAgents: { include: { agent: true } } },
  });

  let generated = 0;
  let skipped   = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Find an active (non-cancelled) invoice for this period.
      // CANCELLED invoices are ignored — treat them as if no invoice exists.
      const existing = await prisma.invoice.findFirst({
        where: { userId: user.id, periodStart, status: { not: 'CANCELLED' } },
      });

      // Only skip statuses that are already finalised (sent/paid).
      // DRAFT → fall through and recalculate.
      if (existing && existing.status !== 'DRAFT') {
        skipped++;
        continue;
      }

      // ── Build line items ────────────────────────────────────────────────
      const agentInputs = await Promise.all(
        user.assignedAgents.map(async ua => {
          const agentRetellId = ua.agent.retellAgentId;

          // SETUP_FEE: already billed on a *different* non-cancelled invoice?
          // When updating a DRAFT, exclude the current invoice so its own
          // SETUP_FEE line item doesn't falsely mark it as "already billed".
          const setupFeeAlreadyBilled = ua.setupFee
            ? !!(await prisma.invoiceLineItem.findFirst({
                where: {
                  type:    'SETUP_FEE',
                  agentId: agentRetellId,
                  invoice: {
                    userId: user.id,
                    status: { not: 'CANCELLED' },
                    ...(existing ? { id: { not: existing.id } } : {}),
                  },
                },
              }))
            : false;

          // Usage: only calls from max(assignedAt, periodStart) → periodEnd
          const effectiveStart = ua.assignedAt > periodStart ? ua.assignedAt : periodStart;
          const usage = ua.costMultiplier
            ? await prisma.call.aggregate({
                where: {
                  agentId:        agentRetellId,
                  startTimestamp: { gte: effectiveStart, lte: periodEnd },
                  totalCost:      { not: null },
                },
                _sum: { totalCost: true },
              })
            : null;

          return {
            retellAgentId:        agentRetellId,
            agentName:            ua.agent.name,
            setupFee:             ua.setupFee       ? Number(ua.setupFee)       : null,
            setupFeeAlreadyBilled,
            monthlyFee:           ua.monthlyFee     ? Number(ua.monthlyFee)     : null,
            costMultiplier:       ua.costMultiplier ? Number(ua.costMultiplier) : null,
            assignedAt:           ua.assignedAt,
            periodStart,
            periodEnd,
            usageCost:            Number(usage?._sum.totalCost ?? 0),
          };
        })
      );

      const lineItems = buildLineItems(agentInputs);

      // Skip users with no billable items
      if (lineItems.length === 0) {
        skipped++;
        continue;
      }

      const subtotal = computeSubtotal(lineItems);

      if (existing) {
        // ── DRAFT exists → replace USAGE_FEE items and refresh totals ──
        await prisma.$transaction(async tx => {
          // Remove stale usage line items
          await tx.invoiceLineItem.deleteMany({
            where: { invoiceId: existing.id, type: 'USAGE_FEE' },
          });

          // Insert fresh usage line items
          const usageItems = lineItems.filter(l => l.type === 'USAGE_FEE');
          if (usageItems.length > 0) {
            await tx.invoiceLineItem.createMany({
              data: usageItems.map(item => ({
                invoiceId:   existing.id,
                type:        item.type,
                agentId:     item.agentId,
                agentName:   item.agentName,
                description: item.description,
                quantity:    item.quantity,
                unitPrice:   item.unitPrice,
                total:       item.total,
              })),
            });
          }

          // Recompute total from ALL line items actually on the invoice (source of truth)
          const allItems = await tx.invoiceLineItem.findMany({
            where:  { invoiceId: existing.id },
            select: { total: true },
          });
          const newSubtotal = Math.round(
            allItems.reduce((s, l) => s + Number(l.total), 0) * 100
          ) / 100;

          await tx.invoice.update({
            where: { id: existing.id },
            data:  { subtotal: newSubtotal, total: newSubtotal },
          });
        });
      } else {
        // ── No active invoice → create fresh ──
        const yyyymm     = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const baseNumber = `INV-${yyyymm}-${user.id.slice(0, 6).toUpperCase()}`;

        // Guard against collision with cancelled invoices that hold the base number
        const takenNumbers = new Set(
          (await prisma.invoice.findMany({
            where:  { invoiceNumber: { startsWith: baseNumber } },
            select: { invoiceNumber: true },
          })).map(r => r.invoiceNumber)
        );
        const invoiceNumber = generateInvoiceNumber(baseNumber, takenNumbers);

        await prisma.$transaction(async tx => {
          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              userId:          user.id,
              periodStart,
              periodEnd,
              status:          'DRAFT',
              subtotal,
              total:           subtotal,
              isAutoGenerated: false,
            },
          });

          await tx.invoiceLineItem.createMany({
            data: lineItems.map(item => ({
              invoiceId:   invoice.id,
              type:        item.type,
              agentId:     item.agentId,
              agentName:   item.agentName,
              description: item.description,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              total:       item.total,
            })),
          });
          // NOTE: setupFeePaid is NOT set here — only set when invoice is marked PAID
        });
      }

      generated++;
    } catch (err) {
      errors.push(`User ${user.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({ generated, skipped, errors });
}
