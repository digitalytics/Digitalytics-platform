import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/error-handler.js';
import { CallInput, RetellCall } from '../types/retell.types.js';

export class CallsRepository {
  /**
   * Safely convert timestamp to Date
   * Handles both seconds and milliseconds, validates range
   */
  private safeTimestampToDate(timestamp: number): Date {
    // If timestamp is in seconds (10 digits), convert to milliseconds
    // If timestamp is in milliseconds (13 digits), use as-is
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;

    const date = new Date(ms);

    // Validate date is reasonable (between year 2000 and 2100)
    const year = date.getFullYear();
    if (year < 2000 || year > 2100 || isNaN(year)) {
      logger.warn(`Invalid timestamp detected: ${timestamp}, using current time instead`);
      return new Date();
    }

    return date;
  }

  /**
   * Convert Retell API call to database input format
   */
  private convertRetellCallToInput(call: RetellCall): CallInput {
    // Note: list-calls doesn't include cost/latency data
    // Will be populated by detailed sync later
    return {
      callId: call.call_id,
      agentId: call.agent_id,
      agentName: call.agent_name,
      callStatus: call.call_status,
      startTimestamp: this.safeTimestampToDate(call.start_timestamp),
      endTimestamp: call.end_timestamp ? this.safeTimestampToDate(call.end_timestamp) : undefined,
      durationMs: call.duration_ms,
      // These live inside call_analysis in the API response, not at the top level
      callSuccessful: call.call_successful ?? (call.call_analysis as any)?.call_successful,
      userSentiment: call.user_sentiment ?? (call.call_analysis as any)?.user_sentiment,
      metadata: call.metadata,
      dynamicVariables: call.retell_llm_dynamic_variables, // API uses retell_llm_dynamic_variables

      // Cost/Latency data (not available in list-calls endpoint)
      totalCost: undefined,
      costDetails: undefined,
      latencyDetails: undefined,

      // Transcript
      transcript:
        call.transcript || call.transcript_object
          ? {
              transcript: call.transcript,
              transcriptObject: call.transcript_object,
            }
          : undefined,

      // Analysis
      callAnalysis:
        call.call_analysis || call.call_summary
          ? {
              callAnalysis: call.call_analysis,
              callSummary: call.call_summary,
            }
          : undefined,

      // Recordings
      recordings:
        call.recording_url || call.stereo_recording_url || call.public_log_url
          ? [
              {
                recordingUrl: call.recording_url,
                stereoRecordingUrl: call.stereo_recording_url,
                publicLogUrl: call.public_log_url,
              },
            ]
          : undefined,
    };
  }

  /**
   * Upsert a single call with all related data
   */
  async upsertCall(callInput: CallInput): Promise<void> {
    try {
      await prisma.$transaction(async tx => {
        // Upsert main call record (now includes cost/latency)
        await tx.call.upsert({
          where: { callId: callInput.callId },
          update: {
            agentId: callInput.agentId,
            agentName: callInput.agentName,
            callStatus: callInput.callStatus,
            startTimestamp: callInput.startTimestamp,
            endTimestamp: callInput.endTimestamp,
            durationMs: callInput.durationMs,
            callSuccessful: callInput.callSuccessful,
            userSentiment: callInput.userSentiment,
            totalCost: callInput.totalCost,
            costDetails: callInput.costDetails as Prisma.InputJsonValue,
            latencyDetails: callInput.latencyDetails as Prisma.InputJsonValue,
            metadata: callInput.metadata as Prisma.InputJsonValue,
            dynamicVariables: callInput.dynamicVariables as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
          create: {
            callId: callInput.callId,
            agentId: callInput.agentId,
            agentName: callInput.agentName,
            callStatus: callInput.callStatus,
            startTimestamp: callInput.startTimestamp,
            endTimestamp: callInput.endTimestamp,
            durationMs: callInput.durationMs,
            callSuccessful: callInput.callSuccessful,
            userSentiment: callInput.userSentiment,
            totalCost: callInput.totalCost,
            costDetails: callInput.costDetails as Prisma.InputJsonValue,
            latencyDetails: callInput.latencyDetails as Prisma.InputJsonValue,
            metadata: callInput.metadata as Prisma.InputJsonValue,
            dynamicVariables: callInput.dynamicVariables as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
        });

        // Upsert transcript
        if (callInput.transcript) {
          await tx.transcript.upsert({
            where: { callId: callInput.callId },
            update: {
              transcript: callInput.transcript.transcript,
              transcriptObject: callInput.transcript.transcriptObject as Prisma.InputJsonValue,
            },
            create: {
              callId: callInput.callId,
              transcript: callInput.transcript.transcript,
              transcriptObject: callInput.transcript.transcriptObject as Prisma.InputJsonValue,
            },
          });
        }

        // Upsert call analysis
        if (callInput.callAnalysis) {
          await tx.callAnalysis.upsert({
            where: { callId: callInput.callId },
            update: {
              callAnalysis: callInput.callAnalysis.callAnalysis as Prisma.InputJsonValue,
              callSummary: callInput.callAnalysis.callSummary,
            },
            create: {
              callId: callInput.callId,
              callAnalysis: callInput.callAnalysis.callAnalysis as Prisma.InputJsonValue,
              callSummary: callInput.callAnalysis.callSummary,
            },
          });
        }

        // Handle recordings - delete old ones and create new
        if (callInput.recordings && callInput.recordings.length > 0) {
          await tx.recording.deleteMany({
            where: { callId: callInput.callId },
          });

          await tx.recording.createMany({
            data: callInput.recordings.map(rec => ({
              callId: callInput.callId,
              recordingUrl: rec.recordingUrl,
              stereoRecordingUrl: rec.stereoRecordingUrl,
              publicLogUrl: rec.publicLogUrl,
            })),
          });
        }
      });
    } catch (error) {
      logger.error('Failed to upsert call', {
        callId: callInput.callId,
        error,
      });
      throw new DatabaseError(`Failed to upsert call ${callInput.callId}: ${error}`);
    }
  }

  /**
   * Upsert calls in batch
   */
  async upsertCallsBatch(calls: RetellCall[], batchSize: number = 50): Promise<void> {
    const batches: RetellCall[][] = [];

    // Split into batches
    for (let i = 0; i < calls.length; i += batchSize) {
      batches.push(calls.slice(i, i + batchSize));
    }

    logger.info(`Processing ${calls.length} calls in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      // Process batch sequentially to avoid database lock issues
      for (const call of batch) {
        const callInput = this.convertRetellCallToInput(call);
        await this.upsertCall(callInput);
      }

      logger.info(`Completed batch ${i + 1}/${batches.length}`);
    }
  }

  /**
   * Get last synced timestamp for a specific agent
   */
  async getLastSyncedTimestamp(agentId?: string): Promise<Date | null> {
    try {
      const result = await prisma.call.findFirst({
        where: agentId ? { agentId } : undefined,
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      });

      return result?.syncedAt || null;
    } catch (error) {
      logger.error('Failed to get last synced timestamp', { agentId, error });
      throw new DatabaseError(`Failed to get last synced timestamp: ${error}`);
    }
  }

  /**
   * Get call by ID
   */
  async getCallById(callId: string) {
    try {
      return await prisma.call.findUnique({
        where: { callId },
        include: {
          transcript: true,
          callAnalysis: true,
          recordings: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get call by ID', { callId, error });
      throw new DatabaseError(`Failed to get call ${callId}: ${error}`);
    }
  }

  /**
   * Update cost and latency data for a call
   */
  async updateCostAndLatency(
    callId: string,
    totalCost?: number,
    costDetails?: any,
    latencyDetails?: any
  ): Promise<void> {
    try {
      await prisma.call.update({
        where: { callId },
        data: {
          totalCost,
          costDetails: costDetails as Prisma.InputJsonValue,
          latencyDetails: latencyDetails as Prisma.InputJsonValue,
        },
      });

      logger.debug('Updated cost/latency data', { callId, totalCost });
    } catch (error) {
      logger.error('Failed to update cost/latency', { callId, error });
      throw new DatabaseError(`Failed to update cost/latency for ${callId}: ${error}`);
    }
  }

  /**
   * Get total call count
   */
  async getTotalCallCount(agentId?: string): Promise<number> {
    try {
      return await prisma.call.count({
        where: agentId ? { agentId } : undefined,
      });
    } catch (error) {
      logger.error('Failed to get total call count', { agentId, error });
      throw new DatabaseError(`Failed to get total call count: ${error}`);
    }
  }

  /**
   * Get calls by agent with pagination
   */
  /**
   * Update metadata and dynamic_variables for a call
   */
  async updateDynamicFields(
    callId: string,
    metadata?: any,
    dynamicVariables?: any
  ): Promise<void> {
    try {
      await prisma.call.update({
        where: { callId },
        data: {
          metadata: metadata as Prisma.InputJsonValue,
          dynamicVariables: dynamicVariables as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update dynamic fields for ${callId}: ${error}`);
    }
  }

  async getCallsByAgent(
    agentId: string,
    limit: number = 100,
    offset: number = 0
  ) {
    try {
      return await prisma.call.findMany({
        where: { agentId },
        orderBy: { startTimestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          transcript: true,
          callAnalysis: true,
          recordings: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get calls by agent', { agentId, error });
      throw new DatabaseError(`Failed to get calls for agent ${agentId}: ${error}`);
    }
  }
}

export default CallsRepository;
