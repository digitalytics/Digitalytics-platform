#!/usr/bin/env node

import { prisma, disconnectDatabase } from '../src/config/database.js';

async function main() {
  try {
    // Get a sample call with all related data
    const sampleCall = await prisma.call.findFirst({
      where: {
        callStatus: 'ended',
      },
      include: {
        transcript: true,
        callAnalysis: true,
        recordings: true,
      },
    });

    if (sampleCall) {
      console.log('Sample Call Data:');
      console.log('================\n');
      console.log('Call ID:', sampleCall.callId);
      console.log('Agent ID:', sampleCall.agentId);
      console.log('Status:', sampleCall.callStatus);
      console.log('Duration:', sampleCall.durationMs ? `${sampleCall.durationMs}ms` : 'N/A');
      console.log('Total Cost:', sampleCall.totalCost ? `$${sampleCall.totalCost}` : 'N/A');
      console.log('\nTranscript:', sampleCall.transcript ? 'Present' : 'Missing');
      console.log('Analysis:', sampleCall.callAnalysis ? 'Present' : 'Missing');
      console.log('Cost Details:', sampleCall.costDetails ? 'Present' : 'Missing');
      console.log('Recordings:', sampleCall.recordings.length);

      if (sampleCall.costDetails) {
        console.log('\nCost Details:');
        console.log(JSON.stringify(sampleCall.costDetails, null, 2));
      }

      if (sampleCall.callAnalysis) {
        console.log('\nAnalysis Present:', sampleCall.callAnalysis.callSummary ? 'Yes' : 'No');
      }
    }
  } finally {
    await disconnectDatabase();
  }
}

main();
