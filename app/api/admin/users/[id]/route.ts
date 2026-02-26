import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  agents: z.array(z.object({
    agentId:     z.string(),
    customPrice: z.number().optional(),
    setupFee:    z.number().optional(),
    monthlyFee:  z.number().optional(),
  })).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { status, role, agents } = parsed.data;

  // Update user status/role
  if (status || role) {
    await prisma.user.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
      },
    });
  }

  // Update agent assignments
  if (agents !== undefined) {
    // Remove all existing and re-create
    await prisma.userAgent.deleteMany({ where: { userId: id } });

    if (agents.length > 0) {
      // Look up agent IDs from retellAgentId
      const agentRecords = await prisma.agent.findMany({
        where: { retellAgentId: { in: agents.map(a => a.agentId) } },
      });

      await prisma.userAgent.createMany({
        data: agentRecords.map(agent => {
          const input = agents.find(a => a.agentId === agent.retellAgentId);
          return {
            userId:      id,
            agentId:     agent.id,
            customPrice: input?.customPrice ?? null,
            setupFee:    input?.setupFee    ?? null,
            monthlyFee:  input?.monthlyFee  ?? null,
            assignedBy:  session.user.id,
          };
        }),
      });
    }
  }

  return NextResponse.json({ success: true });
}
