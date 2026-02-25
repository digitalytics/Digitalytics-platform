import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const outboundCallSchema = z.object({
  agentId: z.string().min(1, 'Agent is required'),
  contactId: z.string().optional(),
  toNumber: z.string().min(1, 'Phone number is required'),
  campaignId: z.string().optional(),
  dynamicVariables: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = outboundCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { agentId, contactId, toNumber, campaignId, dynamicVariables } = parsed.data;

  // Verify the agent is assigned to this user (or user is admin)
  let agent;
  if (session.user.role === 'ADMIN') {
    agent = await prisma.agent.findUnique({ where: { id: agentId } });
  } else {
    const assignment = await prisma.userAgent.findFirst({
      where: { userId: session.user.id, agentId },
      include: { agent: true },
    });
    agent = assignment?.agent;
  }

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found or not assigned' }, { status: 404 });
  }

  if (!agent.phoneNumber) {
    return NextResponse.json(
      { error: 'Agent has no phone number configured. Ask your admin to add a phone number.' },
      { status: 400 }
    );
  }

  // Create OutboundCall record with CALLING status
  const outboundCall = await prisma.outboundCall.create({
    data: {
      userId: session.user.id,
      agentId: agent.id,
      contactId: contactId || null,
      phoneNumber: toNumber,
      fromNumber: agent.phoneNumber,
      status: 'CALLING',
      campaignId: campaignId || null,
    },
  });

  // Call Retell API
  try {
    const retellRes = await fetch(
      `${process.env.RETELL_API_BASE_URL || 'https://api.retellai.com/v2'}/create-phone-call`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_number: agent.phoneNumber,
          to_number: toNumber,
          override_agent_id: agent.retellAgentId,
          ...(dynamicVariables ? { retell_llm_dynamic_variables: dynamicVariables } : {}),
          metadata: { outboundCallId: outboundCall.id, userId: session.user.id },
        }),
      }
    );

    if (!retellRes.ok) {
      const errBody = await retellRes.text();
      await prisma.outboundCall.update({
        where: { id: outboundCall.id },
        data: { status: 'FAILED' },
      });
      return NextResponse.json(
        { error: `Retell API error: ${errBody}` },
        { status: retellRes.status }
      );
    }

    const retellData = await retellRes.json();

    await prisma.outboundCall.update({
      where: { id: outboundCall.id },
      data: { retellCallId: retellData.call_id || null },
    });

    return NextResponse.json({ outboundCall: { ...outboundCall, retellCallId: retellData.call_id } }, { status: 201 });
  } catch (err) {
    await prisma.outboundCall.update({
      where: { id: outboundCall.id },
      data: { status: 'FAILED' },
    });
    console.error('Failed to create Retell phone call:', err);
    return NextResponse.json({ error: 'Failed to initiate call' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where = session.user.role === 'ADMIN' ? {} : { userId: session.user.id };

  const [calls, total] = await Promise.all([
    prisma.outboundCall.findMany({
      where,
      skip,
      take: limit,
      orderBy: { initiatedAt: 'desc' },
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        agent: { select: { name: true } },
      },
    }),
    prisma.outboundCall.count({ where }),
  ]);

  return NextResponse.json({ calls, total, page, limit, totalPages: Math.ceil(total / limit) });
}
