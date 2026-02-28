import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  agents: z.array(z.object({
    agentId:        z.string(),
    costMultiplier: z.number().optional(),
    setupFee:       z.number().optional(),
    monthlyFee:     z.number().optional(),
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
    // Look up agent DB records from retellAgentIds
    const agentRecords = agents.length > 0
      ? await prisma.agent.findMany({
          where: { retellAgentId: { in: agents.map(a => a.agentId) } },
        })
      : [];

    const incomingAgentDbIds = new Set(agentRecords.map(a => a.id));

    // Remove agents that are no longer in the incoming list
    await prisma.userAgent.deleteMany({
      where: { userId: id, agentId: { notIn: [...incomingAgentDbIds] } },
    });

    // Upsert each incoming agent — preserves assignedAt for existing assignments
    // so historical call logs remain visible (calls are filtered by assignedAt).
    for (const agentRecord of agentRecords) {
      const input = agents.find(a => a.agentId === agentRecord.retellAgentId);
      await prisma.userAgent.upsert({
        where:  { userId_agentId: { userId: id, agentId: agentRecord.id } },
        update: {
          costMultiplier: input?.costMultiplier ?? null,
          setupFee:       input?.setupFee       ?? null,
          monthlyFee:     input?.monthlyFee     ?? null,
          assignedBy:     session.user.id,
          // assignedAt intentionally NOT updated — preserves call log visibility
        },
        create: {
          userId:         id,
          agentId:        agentRecord.id,
          costMultiplier: input?.costMultiplier ?? null,
          setupFee:       input?.setupFee       ?? null,
          monthlyFee:     input?.monthlyFee     ?? null,
          assignedBy:     session.user.id,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
