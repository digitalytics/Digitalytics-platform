import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const where = session.user.role === 'ADMIN' ? { id } : { id, userId: session.user.id };

  const campaign = await prisma.campaign.findFirst({
    where,
    include: {
      contactList: { include: { members: { include: { contact: true } } } },
    },
  });

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Cannot start a campaign with status: ${campaign.status}` },
      { status: 400 }
    );
  }

  // Get agent for phone number
  const agent = await prisma.agent.findUnique({ where: { id: campaign.agentId } });
  if (!agent?.phoneNumber) {
    return NextResponse.json(
      { error: 'Agent has no phone number configured' },
      { status: 400 }
    );
  }

  // Get contacts that haven't been called yet in this campaign
  const calledContactIds = await prisma.outboundCall
    .findMany({
      where: { campaignId: id, status: { in: ['CALLING', 'COMPLETED', 'FAILED'] } },
      select: { contactId: true },
    })
    .then(calls => calls.map(c => c.contactId).filter(Boolean) as string[]);

  const remainingContacts = campaign.contactList.members
    .map(m => m.contact)
    .filter(c => !calledContactIds.includes(c.id));

  if (remainingContacts.length === 0) {
    await prisma.campaign.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return NextResponse.json({ message: 'No remaining contacts — campaign marked complete' });
  }

  // Mark campaign as running
  await prisma.campaign.update({
    where: { id },
    data: {
      status: 'RUNNING',
      startedAt: campaign.startedAt || new Date(),
      totalContacts: campaign.contactList.members.length,
    },
  });

  // Fire all calls concurrently and await them fully before returning.
  // Using Promise.all (not void) so the serverless function stays alive
  // until every Retell API request has been dispatched.
  const results = await Promise.all(
    remainingContacts.map(contact => fireOneCall({
      campaignId: id,
      contact,
      agentId: campaign.agentId,
      agentRetellId: agent.retellAgentId,
      fromNumber: agent.phoneNumber!,
      userId: campaign.userId,
      dynamicVariables: campaign.dynamicVariables as Record<string, unknown> | null,
    }))
  );

  const succeeded = results.filter(r => r === 'ok').length;
  const failed = results.filter(r => r === 'failed').length;

  // Mark completed after all calls have been dispatched
  await prisma.campaign.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      calledCount: remainingContacts.length,
      failedCount: failed,
    },
  });

  return NextResponse.json({ started: true, contactsToCall: remainingContacts.length, succeeded, failed });
}

async function fireOneCall({
  campaignId,
  contact,
  agentId,
  agentRetellId,
  fromNumber,
  userId,
  dynamicVariables,
}: {
  campaignId: string;
  contact: { id: string; phone: string };
  agentId: string;
  agentRetellId: string;
  fromNumber: string;
  userId: string;
  dynamicVariables: Record<string, unknown> | null;
}): Promise<'ok' | 'failed'> {
  // Create outbound call record
  const outboundCall = await prisma.outboundCall.create({
    data: {
      userId,
      agentId,
      contactId: contact.id,
      phoneNumber: contact.phone,
      fromNumber,
      status: 'CALLING',
      campaignId,
    },
  });

  try {
    const res = await fetch(
      `${process.env.RETELL_API_BASE_URL || 'https://api.retellai.com/v2'}/create-phone-call`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_number: fromNumber,
          to_number: contact.phone,
          override_agent_id: agentRetellId,
          ...(dynamicVariables ? { retell_llm_dynamic_variables: dynamicVariables } : {}),
          metadata: { campaignId, outboundCallId: outboundCall.id, userId },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      await prisma.outboundCall.update({
        where: { id: outboundCall.id },
        data: { retellCallId: data.call_id || null },
      });
      return 'ok';
    } else {
      const errText = await res.text();
      console.error(`Retell API error for ${contact.phone}:`, errText);
      await prisma.outboundCall.update({
        where: { id: outboundCall.id },
        data: { status: 'FAILED' },
      });
      return 'failed';
    }
  } catch (err) {
    console.error(`Failed to call ${contact.phone}:`, err);
    await prisma.outboundCall.update({
      where: { id: outboundCall.id },
      data: { status: 'FAILED' },
    });
    return 'failed';
  }
}
