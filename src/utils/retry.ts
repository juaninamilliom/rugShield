export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries transient provider operations with linear backoff.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < options.attempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= options.attempts) break;
      await sleep(options.baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry operation failed.');
}

export function providerRetryOptionsFromEnv(): RetryOptions {
  const attempts = Number(process.env.PROVIDER_RETRY_ATTEMPTS || 3);
  const baseDelayMs = Number(process.env.PROVIDER_RETRY_DELAY_MS || 200);
  return {
    attempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 3,
    baseDelayMs: Number.isFinite(baseDelayMs) && baseDelayMs >= 0 ? baseDelayMs : 200,
  };
}

export function providerTimeoutMsFromEnv(): number {
  const timeout = Number(process.env.PROVIDER_TIMEOUT_MS || 4000);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 4000;
}
