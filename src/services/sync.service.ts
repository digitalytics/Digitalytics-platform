import { logger } from '../utils/logger.js';
import { RetellAPIService } from './retell-api.service.js';
import { CallsRepository } from '../repositories/calls.repository.js';
import { SyncResult } from '../types/retell.types.js';

export class SyncService {
  private retellAPI: RetellAPIService;
  private callsRepo: CallsRepository;

  constructor() {
    this.retellAPI = new RetellAPIService();
    this.callsRepo = new CallsRepository();
  }

  /**
   * Perform bulk sync for specified agents
   * Fetches all historical calls
   */
  async performBulkSync(agentIds: string[]): Promise<SyncResult> {
    const startTime = new Date();
    let totalCalls = 0;
    let newCalls = 0;
    let updatedCalls = 0;
    const errors: Array<{ callId?: string; error: string }> = [];

    logger.info('Starting bulk sync', { agentIds, agentCount: agentIds.length });

    try {
      for (const agentId of agentIds) {
        logger.info(`Syncing agent: ${agentId}`);

        try {
          // Fetch all calls for this agent
          const calls = await this.retellAPI.fetchAllCalls(agentId);

          logger.info(`Fetched ${calls.length} calls for agent ${agentId}`);

          // Get count before sync
          const beforeCount = await this.callsRepo.getTotalCallCount(agentId);

          // Upsert calls in batches
          await this.callsRepo.upsertCallsBatch(calls, 50);

          // Get count after sync
          const afterCount = await this.callsRepo.getTotalCallCount(agentId);

          const newCallsForAgent = afterCount - beforeCount;
          const updatedCallsForAgent = calls.length - newCallsForAgent;

          totalCalls += calls.length;
          newCalls += newCallsForAgent;
          updatedCalls += updatedCallsForAgent;

          logger.info(`Completed sync for agent ${agentId}`, {
            totalFetched: calls.length,
            new: newCallsForAgent,
            updated: updatedCallsForAgent,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to sync agent ${agentId}`, { error: errorMessage });
          errors.push({
            error: `Agent ${agentId}: ${errorMessage}`,
          });
        }
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      const result: SyncResult = {
        success: errors.length === 0,
        totalCalls,
        newCalls,
        updatedCalls,
        errors,
        startTime,
        endTime,
        durationMs,
      };

      logger.info('Bulk sync completed', {
        success: result.success,
        totalCalls,
        newCalls,
        updatedCalls,
        errorCount: errors.length,
        durationMs,
        durationSec: (durationMs / 1000).toFixed(2),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Bulk sync failed', { error: errorMessage });

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      return {
        success: false,
        totalCalls,
        newCalls,
        updatedCalls,
        errors: [...errors, { error: errorMessage }],
        startTime,
        endTime,
        durationMs,
      };
    }
  }

  /**
   * Perform incremental sync for specified agents
   * Fetches only new calls since last sync
   */
  async performIncrementalSync(agentIds: string[]): Promise<SyncResult> {
    const startTime = new Date();
    let totalCalls = 0;
    let newCalls = 0;
    let updatedCalls = 0;
    const errors: Array<{ callId?: string; error: string }> = [];

    logger.info('Starting incremental sync', { agentIds, agentCount: agentIds.length });

    try {
      for (const agentId of agentIds) {
        logger.info(`Incremental sync for agent: ${agentId}`);

        try {
          // Get last synced timestamp
          const lastSynced = await this.callsRepo.getLastSyncedTimestamp(agentId);

          if (!lastSynced) {
            logger.warn(`No previous sync found for agent ${agentId}, performing full sync`);
            // If no previous sync, fetch all
            const calls = await this.retellAPI.fetchAllCalls(agentId);
            await this.callsRepo.upsertCallsBatch(calls, 50);
            totalCalls += calls.length;
            newCalls += calls.length;
          } else {
            logger.info(`Last synced at: ${lastSynced.toISOString()}`);

            // Fetch only new calls since last sync
            const calls = await this.retellAPI.fetchAllCalls(agentId, lastSynced);

            logger.info(`Fetched ${calls.length} new/updated calls for agent ${agentId}`);

            if (calls.length > 0) {
              // Get count before sync
              const beforeCount = await this.callsRepo.getTotalCallCount(agentId);

              // Upsert calls
              await this.callsRepo.upsertCallsBatch(calls, 50);

              // Get count after sync
              const afterCount = await this.callsRepo.getTotalCallCount(agentId);

              const newCallsForAgent = afterCount - beforeCount;
              const updatedCallsForAgent = calls.length - newCallsForAgent;

              totalCalls += calls.length;
              newCalls += newCallsForAgent;
              updatedCalls += updatedCallsForAgent;

              logger.info(`Completed incremental sync for agent ${agentId}`, {
                totalFetched: calls.length,
                new: newCallsForAgent,
                updated: updatedCallsForAgent,
              });
            } else {
              logger.info(`No new calls for agent ${agentId}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to sync agent ${agentId}`, { error: errorMessage });
          errors.push({
            error: `Agent ${agentId}: ${errorMessage}`,
          });
        }
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      const result: SyncResult = {
        success: errors.length === 0,
        totalCalls,
        newCalls,
        updatedCalls,
        errors,
        startTime,
        endTime,
        durationMs,
      };

      logger.info('Incremental sync completed', {
        success: result.success,
        totalCalls,
        newCalls,
        updatedCalls,
        errorCount: errors.length,
        durationMs,
        durationSec: (durationMs / 1000).toFixed(2),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Incremental sync failed', { error: errorMessage });

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      return {
        success: false,
        totalCalls,
        newCalls,
        updatedCalls,
        errors: [...errors, { error: errorMessage }],
        startTime,
        endTime,
        durationMs,
      };
    }
  }

  /**
   * Sync a single agent (incremental)
   */
  async syncAgent(agentId: string): Promise<SyncResult> {
    return await this.performIncrementalSync([agentId]);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const stats = await Promise.all([
        this.callsRepo.getTotalCallCount(),
        // Add more stats as needed
      ]);

      return {
        totalCalls: stats[0],
      };
    } catch (error) {
      logger.error('Failed to get sync stats', { error });
      throw error;
    }
  }
}

export default SyncService;
