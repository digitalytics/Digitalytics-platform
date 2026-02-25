#!/usr/bin/env node

import dotenv from 'dotenv';
import { logger } from '../src/utils/logger.js';
import { disconnectDatabase } from '../src/config/database.js';
import { SyncService } from '../src/services/sync.service.js';

dotenv.config();

async function main() {
  const syncService = new SyncService();

  try {
    logger.info('========================================');
    logger.info('INITIAL BULK SYNC - Retell AI Call Logs');
    logger.info('========================================');

    // Get agent IDs from environment
    const agentIdsStr = process.env.RETELL_AGENT_IDS || '';
    const agentIds = agentIdsStr.split(',').map(id => id.trim()).filter(id => id);

    if (agentIds.length === 0) {
      throw new Error('No agent IDs configured. Please set RETELL_AGENT_IDS in .env file');
    }

    logger.info(`Agent IDs to sync: ${agentIds.join(', ')}`);

    // Check if specific agent ID provided via command line
    const args = process.argv.slice(2);
    const agentIdArg = args.find(arg => arg.startsWith('--agent-id='));

    let targetAgents = agentIds;
    if (agentIdArg) {
      const specificAgentId = agentIdArg.split('=')[1];
      if (!agentIds.includes(specificAgentId)) {
        logger.warn(`Agent ID ${specificAgentId} not in configured list, adding it anyway`);
      }
      targetAgents = [specificAgentId];
      logger.info(`Syncing only agent: ${specificAgentId}`);
    }

    logger.info('Starting bulk sync...');
    logger.info('This may take several minutes depending on the number of calls');

    const result = await syncService.performBulkSync(targetAgents);

    logger.info('========================================');
    logger.info('SYNC COMPLETED');
    logger.info('========================================');
    logger.info(`Success: ${result.success ? 'YES' : 'NO'}`);
    logger.info(`Total calls processed: ${result.totalCalls}`);
    logger.info(`New calls: ${result.newCalls}`);
    logger.info(`Updated calls: ${result.updatedCalls}`);
    logger.info(`Errors: ${result.errors.length}`);
    logger.info(`Duration: ${(result.durationMs / 1000).toFixed(2)} seconds`);

    if (result.errors.length > 0) {
      logger.error('Errors encountered during sync:');
      result.errors.forEach((err, idx) => {
        logger.error(`${idx + 1}. ${err.error}`);
      });
    }

    // Get final stats
    const stats = await syncService.getSyncStats();
    logger.info(`Total calls in database: ${stats.totalCalls}`);

    logger.info('========================================');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    logger.error('Initial sync failed', { error });
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
