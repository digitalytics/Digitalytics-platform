#!/usr/bin/env node

import { prisma, disconnectDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  try {
    console.log('========================================');
    console.log('DATABASE VERIFICATION');
    console.log('========================================\n');

    // Total calls
    const totalCalls = await prisma.call.count();
    console.log(`✅ Total calls in database: ${totalCalls}\n`);

    // Calls per agent
    const callsByAgent = await prisma.call.groupBy({
      by: ['agentId'],
      _count: {
        callId: true,
      },
      orderBy: {
        _count: {
          callId: 'desc',
        },
      },
    });

    console.log('📊 Calls by Agent:');
    callsByAgent.forEach(agent => {
      console.log(`   - ${agent.agentId}: ${agent._count.callId} calls`);
    });
    console.log('');

    // Check call statuses
    const callStatuses = await prisma.call.groupBy({
      by: ['callStatus'],
      _count: {
        callId: true,
      },
    });

    console.log('📞 Call Statuses:');
    callStatuses.forEach(status => {
      console.log(`   - ${status.callStatus}: ${status._count.callId} calls`);
    });
    console.log('');

    // Check related data completeness
    const [
      transcriptCount,
      analysisCount,
      recordingsCount,
      callsWithCost,
    ] = await Promise.all([
      prisma.transcript.count(),
      prisma.callAnalysis.count(),
      prisma.recording.count(),
      prisma.call.count({
        where: {
          totalCost: { not: null },
        },
      }),
    ]);

    console.log('🔗 Related Data:');
    console.log(`   - Transcripts: ${transcriptCount}`);
    console.log(`   - Call Analysis: ${analysisCount}`);
    console.log(`   - Recordings: ${recordingsCount}`);
    console.log(`   - Calls with Cost Data: ${callsWithCost}`);
    console.log('');

    // Sample latest calls
    const latestCalls = await prisma.call.findMany({
      take: 5,
      orderBy: {
        startTimestamp: 'desc',
      },
      select: {
        callId: true,
        agentId: true,
        callStatus: true,
        startTimestamp: true,
        durationMs: true,
      },
    });

    console.log('📋 Latest 5 Calls:');
    latestCalls.forEach(call => {
      const duration = call.durationMs ? `${Math.round(call.durationMs / 1000)}s` : 'N/A';
      console.log(
        `   - ${call.callId.substring(0, 20)}... | ${call.callStatus} | ${duration}`
      );
    });
    console.log('');

    // Cost analysis (simplified schema)
    const costStats = await prisma.call.aggregate({
      _sum: {
        totalCost: true,
      },
      _avg: {
        totalCost: true,
      },
    });

    console.log('💰 Cost Summary:');
    console.log(`   - Total Cost: $${costStats._sum.totalCost?.toFixed(4) || '0.00'}`);
    console.log(`   - Average Cost per Call: $${costStats._avg.totalCost?.toFixed(4) || '0.00'}`);
    console.log('');

    console.log('========================================');
    console.log('✅ Verification Complete!');
    console.log('========================================');
  } catch (error) {
    logger.error('Verification failed', { error });
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

main();
