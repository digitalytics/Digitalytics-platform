import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { testDatabaseConnection, disconnectDatabase } from './config/database.js';
import { RetellAPIService } from './services/retell-api.service.js';

dotenv.config();

async function main() {
  try {
    logger.info('Starting Digiweb Agents application...');

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Test Retell API connection
    const retellAPI = new RetellAPIService();
    const apiConnected = await retellAPI.testConnection();
    if (!apiConnected) {
      throw new Error('Retell API connection failed');
    }

    logger.info('All systems operational');
    logger.info('Use npm run sync:initial for bulk import or npm run sync:incremental for updates');
  } catch (error) {
    logger.error('Application startup failed', { error });
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
