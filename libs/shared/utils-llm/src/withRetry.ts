export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableError) {
    const statusCode = error.statusCode;
    if (statusCode !== undefined) {
      return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
    }
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }
    if (message.includes('timeout') || message.includes('etimedout') || message.includes('econnreset')) {
      return true;
    }
  }

  return false;
}

function is4xxError(error: unknown): boolean {
  if (error instanceof RetryableError && error.statusCode !== undefined) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/\b(\d{3})\b/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10);
      return statusCode >= 400 && statusCode < 500;
    }
  }

  return false;
}

function is429Error(error: unknown): boolean {
  if (error instanceof RetryableError && error.statusCode !== undefined) {
    return error.statusCode === 429;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') || message.includes('rate limit');
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryAfterDelay(error: unknown): number | undefined {
  if (!(error instanceof RetryableError) || !error.cause || typeof error.cause !== 'object') {
    return undefined;
  }

  const headers = (error.cause as { headers?: unknown }).headers;
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const getter = (headers as { get?: unknown }).get;
  const value =
    typeof getter === 'function'
      ? getter.call(headers, 'retry-after')
      : (headers as Record<string, unknown>)['retry-after'];
  if (typeof value !== 'string') {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? undefined : Math.max(dateMs - Date.now(), 0);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (is4xxError(error) && !is429Error(error)) {
        throw error;
      }

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      const retryAfterDelay = is429Error(error) ? getRetryAfterDelay(error) : undefined;
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelay;
      const delay = retryAfterDelay ?? Math.min(exponentialDelay + jitter, maxDelay);

      await sleep(delay);
    }
  }

  throw lastError;
}
