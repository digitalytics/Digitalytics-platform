#!/usr/bin/env node

import { RetellAPIService } from '../src/services/retell-api.service.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  try {
    const retellAPI = new RetellAPIService();

    console.log('========================================');
    console.log('TESTING RETELL API RESPONSE STRUCTURE');
    console.log('========================================\n');

    // Fetch first page with limit 1
    const response = await retellAPI.fetchCallsPaginated({ limit: 1 });

    if (response.calls.length > 0) {
      const sampleCall = response.calls[0];

      console.log('Sample Call ID:', sampleCall.call_id);
      console.log('\nFields Present in API Response:');
      console.log('=====================================\n');

      // Check which fields are present
      const fields = {
        'Basic Info': {
          call_id: sampleCall.call_id,
          agent_id: sampleCall.agent_id,
          call_status: sampleCall.call_status,
          start_timestamp: sampleCall.start_timestamp,
          end_timestamp: sampleCall.end_timestamp,
          duration_ms: sampleCall.duration_ms,
        },
        'Cost Fields': {
          llm_cost: sampleCall.llm_cost,
          llm_prompt_tokens: sampleCall.llm_prompt_tokens,
          llm_completion_tokens: sampleCall.llm_completion_tokens,
          tts_cost: sampleCall.tts_cost,
          tts_characters: sampleCall.tts_characters,
          stt_cost: sampleCall.stt_cost,
          stt_seconds: sampleCall.stt_seconds,
          telephony_cost: sampleCall.telephony_cost,
          telephony_seconds: sampleCall.telephony_seconds,
        },
        'Latency Fields': {
          e2e_latency_p50: sampleCall.e2e_latency_p50,
          e2e_latency_p90: sampleCall.e2e_latency_p90,
          e2e_latency_p95: sampleCall.e2e_latency_p95,
          e2e_latency_p99: sampleCall.e2e_latency_p99,
          llm_latency_p50: sampleCall.llm_latency_p50,
          llm_latency_p90: sampleCall.llm_latency_p90,
          llm_latency_p95: sampleCall.llm_latency_p95,
          llm_latency_p99: sampleCall.llm_latency_p99,
        },
        'Other Fields': {
          transcript: sampleCall.transcript ? 'Present' : 'Missing',
          call_analysis: sampleCall.call_analysis ? 'Present' : 'Missing',
          recording_url: sampleCall.recording_url ? 'Present' : 'Missing',
          metadata: sampleCall.metadata,
        },
      };

      for (const [category, categoryFields] of Object.entries(fields)) {
        console.log(`${category}:`);
        for (const [field, value] of Object.entries(categoryFields)) {
          const status = value === undefined ? '❌ MISSING' : value === null ? '⚠️ NULL' : '✅ Present';
          console.log(`  ${field}: ${status}${value !== undefined && value !== null && typeof value !== 'object' ? ` (${value})` : ''}`);
        }
        console.log('');
      }

      console.log('\nFull API Response (first call):');
      console.log('=====================================');
      console.log(JSON.stringify(sampleCall, null, 2));
    }
  } catch (error) {
    logger.error('API test failed', { error });
    process.exit(1);
  }
}

main();
