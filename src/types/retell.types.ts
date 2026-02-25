import { z } from 'zod';

// Zod schemas for runtime validation

export const TranscriptSegmentSchema = z.object({
  role: z.string(),
  content: z.string(),
  timestamp: z.number().optional(),
});

export const CallAnalysisSchema = z.any(); // Flexible JSON structure

export const CallCostsSchema = z.object({
  llm_cost: z.number().optional(),
  llm_prompt_tokens: z.number().optional(),
  llm_completion_tokens: z.number().optional(),
  tts_cost: z.number().optional(),
  tts_characters: z.number().optional(),
  stt_cost: z.number().optional(),
  stt_seconds: z.number().optional(),
  telephony_cost: z.number().optional(),
  telephony_seconds: z.number().optional(),
});

export const LatencyMetricsSchema = z.object({
  e2e_latency_p50: z.number().optional(),
  e2e_latency_p90: z.number().optional(),
  e2e_latency_p95: z.number().optional(),
  e2e_latency_p99: z.number().optional(),
  llm_latency_p50: z.number().optional(),
  llm_latency_p90: z.number().optional(),
  llm_latency_p95: z.number().optional(),
  llm_latency_p99: z.number().optional(),
});

export const RetellCallSchema = z.object({
  call_id: z.string(),
  agent_id: z.string(),
  agent_name: z.string().optional(),
  call_status: z.enum(['registered', 'ongoing', 'ended', 'error', 'not_connected']),
  start_timestamp: z.number(),
  end_timestamp: z.number().optional(),
  duration_ms: z.number().optional(),
  call_successful: z.boolean().optional(),
  user_sentiment: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  retell_llm_dynamic_variables: z.record(z.any()).optional(), // actual API field name

  // Transcript
  transcript: z.string().optional(),
  transcript_object: z.array(TranscriptSegmentSchema).optional(),

  // Analysis
  call_analysis: CallAnalysisSchema.optional(),
  call_summary: z.string().optional(),

  // Costs
  llm_cost: z.number().optional(),
  llm_prompt_tokens: z.number().optional(),
  llm_completion_tokens: z.number().optional(),
  tts_cost: z.number().optional(),
  tts_characters: z.number().optional(),
  stt_cost: z.number().optional(),
  stt_seconds: z.number().optional(),
  telephony_cost: z.number().optional(),
  telephony_seconds: z.number().optional(),

  // Latency
  e2e_latency_p50: z.number().optional(),
  e2e_latency_p90: z.number().optional(),
  e2e_latency_p95: z.number().optional(),
  e2e_latency_p99: z.number().optional(),
  llm_latency_p50: z.number().optional(),
  llm_latency_p90: z.number().optional(),
  llm_latency_p95: z.number().optional(),
  llm_latency_p99: z.number().optional(),

  // Recordings
  recording_url: z.string().optional(),
  stereo_recording_url: z.string().optional(),
  public_log_url: z.string().optional(),
});

// Retell API returns an array directly, not an object
export const RetellCallsArraySchema = z.array(RetellCallSchema);

// Internal response format (for consistency)
export const RetellCallsResponseSchema = z.object({
  calls: z.array(RetellCallSchema),
  pagination_key: z.string().optional(),
  has_more: z.boolean().optional(),
});

// Detailed call response from get-call endpoint
export const DetailedCallCostSchema = z.object({
  product_costs: z.array(z.object({
    product_name: z.string().optional(),
    unit_price: z.number().optional(),
    cost: z.number().optional(), // In cents
  }).passthrough()).optional(), // Allow extra fields
  total_duration_seconds: z.number().optional(),
  total_duration_unit_price: z.number().optional(),
  combined_cost: z.number().optional(), // In cents
}).passthrough(); // Allow extra fields

export const DetailedLatencySchema = z.object({
  e2e: z.object({
    p50: z.number().optional(),
    p90: z.number().optional(),
    p95: z.number().optional(),
    p99: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    num: z.number().optional(),
  }).optional(),
  llm: z.object({
    p50: z.number().optional(),
    p90: z.number().optional(),
    p95: z.number().optional(),
    p99: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    num: z.number().optional(),
  }).optional(),
  tts: z.object({
    p50: z.number().optional(),
    p90: z.number().optional(),
    p95: z.number().optional(),
    p99: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    num: z.number().optional(),
  }).optional(),
});

export const DetailedCallResponseSchema = z.object({
  call_id: z.string(),
  agent_id: z.string(),
  call_cost: DetailedCallCostSchema.optional(),
  latency: DetailedLatencySchema.optional(),
  metadata: z.record(z.any()).optional(),
  retell_llm_dynamic_variables: z.record(z.any()).optional(),
}).passthrough();

// TypeScript types derived from Zod schemas
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type CallAnalysis = z.infer<typeof CallAnalysisSchema>;
export type CallCosts = z.infer<typeof CallCostsSchema>;
export type LatencyMetrics = z.infer<typeof LatencyMetricsSchema>;
export type RetellCall = z.infer<typeof RetellCallSchema>;
export type RetellCallsResponse = z.infer<typeof RetellCallsResponseSchema>;
export type DetailedCallCost = z.infer<typeof DetailedCallCostSchema>;
export type DetailedLatency = z.infer<typeof DetailedLatencySchema>;
export type DetailedCallResponse = z.infer<typeof DetailedCallResponseSchema>;

// Database input types for repository layer
export interface CallInput {
  callId: string;
  agentId: string;
  agentName?: string;
  callStatus: string;
  startTimestamp: Date;
  endTimestamp?: Date;
  durationMs?: number;
  callSuccessful?: boolean;
  userSentiment?: string;
  metadata?: any;
  dynamicVariables?: any;

  // Simplified cost tracking
  totalCost?: number;
  costDetails?: any; // Full cost breakdown (optional)

  // Simplified latency tracking
  latencyDetails?: any; // Full latency metrics (optional)

  // Related data
  transcript?: {
    transcript?: string;
    transcriptObject?: any;
  };

  callAnalysis?: {
    callAnalysis?: any;
    callSummary?: string;
  };

  recordings?: Array<{
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    publicLogUrl?: string;
  }>;
}

// Sync result types
export interface SyncResult {
  success: boolean;
  totalCalls: number;
  newCalls: number;
  updatedCalls: number;
  errors: Array<{
    callId?: string;
    error: string;
  }>;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

// API filter parameters
export interface FetchCallsParams {
  agentId?: string;
  paginationKey?: string;
  filterStartTime?: number;
  limit?: number;
}
