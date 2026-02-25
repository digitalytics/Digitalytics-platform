import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Singleton pattern for Prisma client
declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
};

export const prisma = global.prisma ?? prismaClientSingleton();

// Log Prisma events
prisma.$on('query' as never, (e: any) => {
  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Error', { error: e });
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma Warning', { warning: e });
});

prisma.$on('info' as never, (e: any) => {
  logger.info('Prisma Info', { info: e });
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

export default prisma;
