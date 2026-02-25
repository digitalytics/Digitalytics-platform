#!/usr/bin/env node

import dotenv from 'dotenv';
import { logger } from '../src/utils/logger.js';
import { prisma, disconnectDatabase } from '../src/config/database.js';
import { RetellAPIService } from '../src/services/retell-api.service.js';
import { CallsRepository } from '../src/repositories/calls.repository.js';
import { sleep } from '../src/utils/error-handler.js';

dotenv.config();

async function main() {
  const retellAPI = new RetellAPIService();
  const callsRepo = new CallsRepository();

  try {
    logger.info('========================================');
    logger.info('DETAILED SYNC - Fetch Cost & Latency Data');
    logger.info('========================================');

    // Check for --all flag to re-fetch every call (for backfills)
    const forceAll = process.argv.includes('--all');

    const calls = await prisma.call.findMany({
      where: forceAll ? undefined : { totalCost: null },
      select: {
        callId: true,
        agentId: true,
        callStatus: true,
      },
    });

    logger.info(`Found ${calls.length} calls to process${forceAll ? ' (full backfill)' : ' missing cost data'}`);

    if (calls.length === 0) {
      logger.info('All calls already have cost data. Nothing to sync!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ callId: string; error: string }> = [];

    logger.info('Starting detailed fetch...');
    logger.info('This will make 1 API call per call - please be patient!');
    console.log(''); // Blank line for progress

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];

      try {
        // Show progress every 10 calls
        if (i % 10 === 0) {
          const progress = ((i / calls.length) * 100).toFixed(1);
          logger.info(`Progress: ${i}/${calls.length} (${progress}%) - Success: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
        }

        // Fetch detailed call data
        const detailedData = await retellAPI.fetchDetailedCallData(call.callId);

        // Always save metadata and dynamic_variables regardless of cost availability
        const hasDynamicFields =
          detailedData.metadata || detailedData.retell_llm_dynamic_variables;

        if (hasDynamicFields) {
          await callsRepo.updateDynamicFields(
            call.callId,
            detailedData.metadata,
            detailedData.retell_llm_dynamic_variables
          );
        }

        // Skip cost/latency update if no cost data (e.g., not_connected, error status)
        if (!detailedData.call_cost || !detailedData.call_cost.combined_cost) {
          logger.debug(`Skipping cost for ${call.callId} - no cost data (status: ${call.callStatus})`);
          skippedCount++;
          continue;
        }

        // Extract cost data
        const totalCostCents = detailedData.call_cost.combined_cost;
        const totalCostDollars = totalCostCents / 100; // Convert cents to dollars

        // Update cost and latency
        await callsRepo.updateCostAndLatency(
          call.callId,
          totalCostDollars,
          detailedData.call_cost,
          detailedData.latency
        );

        successCount++;

        // Small delay to avoid rate limiting (100ms between calls)
        await sleep(100);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to fetch/update ${call.callId}: ${errorMessage}`);
        errors.push({ callId: call.callId, error: errorMessage });
        errorCount++;

        // Continue with next call even if this one fails
        continue;
      }
    }

    logger.info('========================================');
    logger.info('DETAILED SYNC COMPLETED');
    logger.info('========================================');
    logger.info(`Total calls processed: ${calls.length}`);
    logger.info(`Successfully updated: ${successCount}`);
    logger.info(`Skipped (no cost data): ${skippedCount}`);
    logger.info(`Errors: ${errorCount}`);

    if (errors.length > 0 && errors.length <= 10) {
      logger.error('Errors encountered:');
      errors.forEach((err, idx) => {
        logger.error(`${idx + 1}. ${err.callId}: ${err.error}`);
      });
    } else if (errors.length > 10) {
      logger.error(`Too many errors to display (${errors.length} total). Check logs for details.`);
    }

    // Show cost summary
    const costStats = await prisma.call.aggregate({
      _sum: { totalCost: true },
      _avg: { totalCost: true },
      _count: { totalCost: true },
    });

    logger.info('========================================');
    logger.info('COST SUMMARY');
    logger.info('========================================');
    logger.info(`Calls with cost data: ${costStats._count.totalCost}`);
    logger.info(`Total cost: $${costStats._sum.totalCost?.toFixed(4) || '0.00'}`);
    logger.info(`Average cost per call: $${costStats._avg.totalCost?.toFixed(4) || '0.00'}`);

    // Cost by agent
    const costsByAgent = await prisma.call.groupBy({
      by: ['agentId'],
      where: {
        totalCost: { not: null },
      },
      _sum: { totalCost: true },
      _count: { callId: true },
    });

    logger.info('');
    logger.info('Cost by Agent:');
    costsByAgent.forEach(agent => {
      logger.info(`  ${agent.agentId}: $${agent._sum.totalCost?.toFixed(4)} (${agent._count.callId} calls)`);
    });

    logger.info('========================================');

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Detailed sync failed', { error });
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
