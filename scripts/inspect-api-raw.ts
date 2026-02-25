#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const callIds = [
  'call_95b0b5d6f7826f15d2dccbac435',
  'call_406f34fd21c7afa0c8182931064',
  'call_b04a841175491bd6431306b39bc',
];

async function main() {
  const client = axios.create({
    baseURL: process.env.RETELL_API_BASE_URL,
    headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
  });

  for (const callId of callIds) {
    const { data } = await client.get(`/get-call/${callId}`);

    console.log(`\n===== ${callId} =====`);
    console.log('metadata                     :', JSON.stringify(data.metadata));
    console.log('dynamic_variables            :', JSON.stringify(data.dynamic_variables));
    console.log('retell_llm_dynamic_variables :', JSON.stringify(data.retell_llm_dynamic_variables));
  }
}

main();
