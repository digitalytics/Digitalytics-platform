import { logger } from './logger.js';
import { AxiosError } from 'axios';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// Handle Axios errors
export function handleAxiosError(error: AxiosError): never {
  if (error.response) {
    // Server responded with error status
    const message = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    logger.error(message, {
      status: error.response.status,
      data: error.response.data,
      url: error.config?.url,
    });
    throw new APIError(message, error.response.status);
  } else if (error.request) {
    // Request made but no response
    const message = 'API Error: No response received from server';
    logger.error(message, { error: error.message });
    throw new APIError(message, 503);
  } else {
    // Error setting up request
    const message = `API Error: ${error.message}`;
    logger.error(message, { error: error.message });
    throw new APIError(message, 500);
  }
}

// Generic error handler
export function handleError(error: unknown): void {
  if (error instanceof AppError) {
    logger.error(error.message, {
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    logger.error(error.message, { stack: error.stack });
  } else {
    logger.error('Unknown error occurred', { error });
  }
}

// Sleep utility for retries
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry logic with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
          error: lastError.message,
        });
        await sleep(delay);
      }
    }
  }

  logger.error(`All ${maxRetries} retry attempts failed`, {
    error: lastError!.message,
  });
  throw lastError!;
}
