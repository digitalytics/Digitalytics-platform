import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { handleAxiosError, retryWithBackoff } from '../utils/error-handler.js';
import {
  RetellCall,
  RetellCallsResponse,
  RetellCallsArraySchema,
  DetailedCallResponse,
  DetailedCallResponseSchema,
  FetchCallsParams,
} from '../types/retell.types.js';

dotenv.config();

export class RetellAPIService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.RETELL_API_KEY || '';
    this.baseURL = process.env.RETELL_API_BASE_URL || 'https://api.retellai.com/v2';

    if (!this.apiKey) {
      throw new Error('RETELL_API_KEY is not set in environment variables');
    }

    // Initialize Axios client
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    logger.info('RetellAPIService initialized', { baseURL: this.baseURL });
  }

  /**
   * Fetch calls with pagination support
   * @param params - Filter parameters
   * @returns Paginated response with calls and pagination key
   */
  async fetchCallsPaginated(params: FetchCallsParams = {}): Promise<RetellCallsResponse> {
    try {
      const requestBody: Record<string, any> = {};

      // Build filter_criteria object if needed
      if (params.agentId || params.filterStartTime) {
        requestBody.filter_criteria = {};

        if (params.agentId) {
          requestBody.filter_criteria.agent_id = [params.agentId];
        }

        if (params.filterStartTime) {
          requestBody.filter_criteria.start_timestamp_after_ms = params.filterStartTime * 1000;
        }
      }

      if (params.paginationKey) {
        requestBody.pagination_key = params.paginationKey;
      }

      if (params.limit) {
        requestBody.limit = Math.min(params.limit, 1000); // Max 1000 per request
      } else {
        requestBody.limit = 1000; // Default to max
      }

      // Default sort order: descending by start_timestamp
      requestBody.sort_order = 'descending';

      logger.debug('Fetching calls from Retell API', { requestBody });

      const response = await retryWithBackoff(async () => {
        return await this.client.post('/list-calls', requestBody);
      });

      // Validate response with Zod (API returns array directly)
      const callsArray = RetellCallsArraySchema.parse(response.data);

      // Determine pagination_key (use last call's ID if we got the full limit)
      let paginationKey: string | undefined = undefined;
      const requestLimit = requestBody.limit || 1000;

      if (callsArray.length === requestLimit && callsArray.length > 0) {
        paginationKey = callsArray[callsArray.length - 1].call_id;
      }

      const result: RetellCallsResponse = {
        calls: callsArray,
        pagination_key: paginationKey,
        has_more: !!paginationKey,
      };

      logger.info('Successfully fetched calls', {
        count: result.calls.length,
        hasMore: result.has_more,
        paginationKey: result.pagination_key,
        agentId: params.agentId,
      });

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Fetch all calls by iterating through pagination
   * @param agentId - Optional agent ID filter
   * @param sinceTimestamp - Optional start timestamp filter
   * @returns All calls matching the filters
   */
  async fetchAllCalls(agentId?: string, sinceTimestamp?: Date): Promise<RetellCall[]> {
    const allCalls: RetellCall[] = [];
    let paginationKey: string | undefined = undefined;
    let pageCount = 0;

    logger.info('Starting bulk fetch of all calls', {
      agentId,
      sinceTimestamp: sinceTimestamp?.toISOString(),
    });

    try {
      do {
        pageCount++;
        const params: FetchCallsParams = {
          agentId,
          paginationKey,
        };

        if (sinceTimestamp) {
          params.filterStartTime = Math.floor(sinceTimestamp.getTime() / 1000);
        }

        const response = await this.fetchCallsPaginated(params);
        allCalls.push(...response.calls);

        paginationKey = response.pagination_key;

        logger.info(`Fetched page ${pageCount}`, {
          pageSize: response.calls.length,
          totalSoFar: allCalls.length,
          hasMore: !!paginationKey,
        });

        // Small delay to avoid rate limiting
        if (paginationKey) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (paginationKey);

      logger.info('Completed bulk fetch', {
        totalCalls: allCalls.length,
        totalPages: pageCount,
        agentId,
      });

      return allCalls;
    } catch (error) {
      logger.error('Error during bulk fetch', {
        error,
        callsFetchedSoFar: allCalls.length,
        pageCount,
      });
      throw error;
    }
  }

  /**
   * Fetch a single call by ID (basic data)
   * @param callId - Call ID
   * @returns Call data
   */
  async fetchCallById(callId: string): Promise<RetellCall> {
    try {
      logger.debug('Fetching call by ID', { callId });

      const response = await retryWithBackoff(async () => {
        return await this.client.get(`/get-call/${callId}`);
      });

      logger.info('Successfully fetched call', { callId });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Fetch detailed call data including cost and latency
   * @param callId - Call ID
   * @returns Detailed call data with cost/latency
   */
  async fetchDetailedCallData(callId: string): Promise<DetailedCallResponse> {
    try {
      logger.debug('Fetching detailed call data', { callId });

      const response = await retryWithBackoff(async () => {
        return await this.client.get(`/get-call/${callId}`);
      });

      // Validate response with Zod
      const validatedData = DetailedCallResponseSchema.parse(response.data);

      logger.debug('Successfully fetched detailed call data', {
        callId,
        hasCost: !!validatedData.call_cost,
        hasLatency: !!validatedData.latency,
      });

      return validatedData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Create an outbound phone call via Retell AI
   */
  async createPhoneCall(params: {
    fromNumber: string;
    toNumber: string;
    agentId: string;
    metadata?: Record<string, unknown>;
    dynamicVariables?: Record<string, unknown>;
  }): Promise<{ call_id: string; [key: string]: unknown }> {
    try {
      logger.info('Creating outbound phone call', {
        agentId: params.agentId,
        toNumber: params.toNumber,
      });

      const response = await retryWithBackoff(async () => {
        return await this.client.post('/create-phone-call', {
          from_number: params.fromNumber,
          to_number: params.toNumber,
          agent_id: params.agentId,
          ...(params.metadata ? { metadata: params.metadata } : {}),
          ...(params.dynamicVariables ? { retell_llm_dynamic_variables: params.dynamicVariables } : {}),
        });
      });

      logger.info('Successfully created outbound phone call', {
        callId: response.data?.call_id,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      }
      throw error;
    }
  }

  /**
   * Test API connection
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing Retell API connection...');

      // Fetch just 1 call to test
      await this.fetchCallsPaginated({ limit: 1 });

      logger.info('Retell API connection test successful');
      return true;
    } catch (error) {
      logger.error('Retell API connection test failed', { error });
      return false;
    }
  }
}

export default RetellAPIService;
