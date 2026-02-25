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

  // Fire calls asynchronously (non-blocking) using a sequential background process
  void fireCampaignCalls({
    campaignId: id,
    contacts: remainingContacts,
    agentId: campaign.agentId,
    agentRetellId: agent.retellAgentId,
    fromNumber: agent.phoneNumber,
    userId: campaign.userId,
    delaySeconds: campaign.delaySeconds,
    dynamicVariables: campaign.dynamicVariables as Record<string, unknown> | null,
  });

  return NextResponse.json({ started: true, contactsToCall: remainingContacts.length });
}

async function fireCampaignCalls({
  campaignId,
  contacts,
  agentId,
  agentRetellId,
  fromNumber,
  userId,
  delaySeconds,
  dynamicVariables,
}: {
  campaignId: string;
  contacts: Array<{ id: string; phone: string }>;
  agentId: string;
  agentRetellId: string;
  fromNumber: string;
  userId: string;
  delaySeconds: number;
  dynamicVariables: Record<string, unknown> | null;
}) {
  for (const contact of contacts) {
    // Check if campaign was paused/cancelled
    const fresh = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (!fresh || fresh.status !== 'RUNNING') break;

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

    // Fire Retell API call
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
            agent_id: agentRetellId,
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
      } else {
        await prisma.outboundCall.update({
          where: { id: outboundCall.id },
          data: { status: 'FAILED' },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 }, calledCount: { increment: 1 } },
        });
      }
    } catch {
      await prisma.outboundCall.update({
        where: { id: outboundCall.id },
        data: { status: 'FAILED' },
      });
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 }, calledCount: { increment: 1 } },
      });
    }

    // Delay between calls
    if (delaySeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }
}
