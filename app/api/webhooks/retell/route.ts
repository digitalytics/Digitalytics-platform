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
      agent_name?: string;
      call_status: string;
      start_timestamp?: number;
      end_timestamp?: number;
      duration_ms?: number;
      call_successful?: boolean;
      user_sentiment?: string;
      total_cost?: number;
      metadata?: Record<string, unknown>;
      transcript?: string;
      transcript_object?: unknown;
      call_summary?: string;
      recording_url?: string;
      stereo_recording_url?: string;
      public_log_url?: string;
      call_analysis?: {
        call_successful?: boolean;
        user_sentiment?: string;
        call_summary?: string;
        [key: string]: unknown;
      };
      retell_llm_dynamic_variables?: Record<string, unknown>;
    };
  };

  if (!event || !call?.call_id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (event === 'call_ended' || event === 'call_analyzed') {
      // Resolve callSuccessful and userSentiment from top-level or nested call_analysis
      const callSuccessful = call.call_successful ?? call.call_analysis?.call_successful ?? null;
      const userSentiment = call.user_sentiment ?? call.call_analysis?.user_sentiment ?? null;

      // Resolve agentName: use payload value or look up from local DB
      let agentName = call.agent_name ?? null;
      if (!agentName && call.agent_id) {
        const localAgent = await prisma.agent.findFirst({
          where: { retellAgentId: call.agent_id },
          select: { name: true },
        });
        agentName = localAgent?.name ?? null;
      }

      // Upsert the call record
      await prisma.call.upsert({
        where: { callId: call.call_id },
        create: {
          callId: call.call_id,
          agentId: call.agent_id,
          agentName,
          callStatus: call.call_status || 'ended',
          startTimestamp: call.start_timestamp ? new Date(call.start_timestamp) : new Date(),
          endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : null,
          durationMs: call.duration_ms ?? null,
          callSuccessful,
          userSentiment,
          totalCost: call.total_cost ?? null,
          metadata: call.metadata ? (call.metadata as Prisma.InputJsonValue) : undefined,
          dynamicVariables: call.retell_llm_dynamic_variables
            ? (call.retell_llm_dynamic_variables as Prisma.InputJsonValue)
            : undefined,
          syncedAt: new Date(),
        },
        update: {
          agentName: agentName ?? undefined,
          callStatus: call.call_status || 'ended',
          endTimestamp: call.end_timestamp ? new Date(call.end_timestamp) : undefined,
          durationMs: call.duration_ms ?? undefined,
          ...(callSuccessful !== null ? { callSuccessful } : {}),
          ...(userSentiment ? { userSentiment } : {}),
          totalCost: call.total_cost ?? undefined,
          syncedAt: new Date(),
        },
      });

      // Upsert transcript if present
      if (call.transcript || call.transcript_object) {
        await prisma.transcript.upsert({
          where: { callId: call.call_id },
          create: {
            callId: call.call_id,
            transcript: call.transcript ?? null,
            transcriptObject: call.transcript_object
              ? (call.transcript_object as Prisma.InputJsonValue)
              : undefined,
          },
          update: {
            transcript: call.transcript ?? undefined,
            transcriptObject: call.transcript_object
              ? (call.transcript_object as Prisma.InputJsonValue)
              : undefined,
          },
        });
      }

      // Upsert call analysis if present
      const callAnalysisData = call.call_analysis;
      const callSummary = call.call_summary ?? call.call_analysis?.call_summary ?? null;
      if (callAnalysisData || callSummary) {
        await prisma.callAnalysis.upsert({
          where: { callId: call.call_id },
          create: {
            callId: call.call_id,
            callAnalysis: callAnalysisData
              ? (callAnalysisData as Prisma.InputJsonValue)
              : undefined,
            callSummary: callSummary ?? undefined,
          },
          update: {
            callAnalysis: callAnalysisData
              ? (callAnalysisData as Prisma.InputJsonValue)
              : undefined,
            callSummary: callSummary ?? undefined,
          },
        });
      }

      // Upsert recording if present
      if (call.recording_url || call.stereo_recording_url || call.public_log_url) {
        await prisma.recording.deleteMany({ where: { callId: call.call_id } });
        await prisma.recording.create({
          data: {
            callId: call.call_id,
            recordingUrl: call.recording_url ?? null,
            stereoRecordingUrl: call.stereo_recording_url ?? null,
            publicLogUrl: call.public_log_url ?? null,
          },
        });
      }

      // Update OutboundCall status if this was an outbound call
      const outboundCall = await prisma.outboundCall.findUnique({
        where: { retellCallId: call.call_id },
      });

      if (outboundCall) {
        // COMPLETED = call was answered and ended (regardless of whether the
        // objective was achieved — call_successful tracks that separately).
        // FAILED = call never connected (not_connected / error).
        const newStatus =
          call.call_status === 'ended'
            ? 'COMPLETED'
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
