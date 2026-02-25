import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Retell sends webhook events for call lifecycle
// We use this to auto-sync call data and update outbound call statuses

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { event, call } = body as {
    event: string;
    call: {
      call_id: string;
      agent_id: string;
      call_status: string;
      start_timestamp?: number;
      end_timestamp?: number;
      duration_ms?: number;
      call_successful?: boolean;
      user_sentiment?: string;
      total_cost?: number;
      metadata?: Record<string, unknown>;
    };
  };

  if (!event || !call?.call_id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (event === 'call_ended' || event === 'call_analyzed') {
      // Upsert the call record
      await prisma.call.upsert({
        where: { callId: call.call_id },
        create: {
          callId: call.call_id,
          agentId: call.agent_id,
          callStatus: call.call_status || 'ended',
          startTimestamp: call.start_timestamp
            ? new Date(call.start_timestamp)
            : new Date(),
          endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : null,
          durationMs: call.duration_ms || null,
          callSuccessful: call.call_successful ?? null,
          userSentiment: call.user_sentiment || null,
          totalCost: call.total_cost ?? null,
          metadata: call.metadata ? (call.metadata as Prisma.InputJsonValue) : undefined,
          syncedAt: new Date(),
        },
        update: {
          callStatus: call.call_status || 'ended',
          endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : undefined,
          durationMs: call.duration_ms || undefined,
          callSuccessful: call.call_successful ?? undefined,
          userSentiment: call.user_sentiment || undefined,
          totalCost: call.total_cost ?? undefined,
          syncedAt: new Date(),
        },
      });

      // Update OutboundCall status if this was an outbound call
      const outboundCall = await prisma.outboundCall.findUnique({
        where: { retellCallId: call.call_id },
      });

      if (outboundCall) {
        const newStatus =
          call.call_status === 'ended'
            ? call.call_successful
              ? 'COMPLETED'
              : 'FAILED'
            : call.call_status === 'error' || call.call_status === 'not_connected'
            ? 'FAILED'
            : undefined;

        if (newStatus) {
          await prisma.outboundCall.update({
            where: { id: outboundCall.id },
            data: { status: newStatus },
          });

          // Update campaign counters if this belongs to a campaign
          if (outboundCall.campaignId) {
            const updateData: Record<string, unknown> = { calledCount: { increment: 1 } };
            if (newStatus === 'COMPLETED') {
              updateData.connectedCount = { increment: 1 };
            } else if (newStatus === 'FAILED') {
              updateData.failedCount = { increment: 1 };
            }
            await prisma.campaign.update({
              where: { id: outboundCall.campaignId },
              data: updateData as Parameters<typeof prisma.campaign.update>[0]['data'],
            });

            // Check if campaign is complete
            const campaign = await prisma.campaign.findUnique({
              where: { id: outboundCall.campaignId },
              include: { _count: { select: { outboundCalls: true } } },
            });
            if (campaign && campaign.status === 'RUNNING') {
              const allDone = await prisma.outboundCall.count({
                where: {
                  campaignId: outboundCall.campaignId,
                  status: { in: ['PENDING', 'CALLING'] },
                },
              });
              if (allDone === 0) {
                await prisma.campaign.update({
                  where: { id: outboundCall.campaignId },
                  data: { status: 'COMPLETED', completedAt: new Date() },
                });
                // Create notification for campaign owner
                await prisma.notification.create({
                  data: {
                    userId: campaign.userId,
                    type: 'CAMPAIGN_COMPLETED',
                    title: 'Campaign Completed',
                    message: `Campaign "${campaign.name}" has finished. ${campaign.connectedCount + (newStatus === 'COMPLETED' ? 1 : 0)} contacts reached.`,
                    link: `/campaigns/${campaign.id}`,
                  },
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
