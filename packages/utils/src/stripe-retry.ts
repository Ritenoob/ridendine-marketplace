/**
 * Retry wrapper for Stripe API calls with exponential backoff.
 * Retries on transient errors (network, 429, 500-503).
 */
export async function withStripeRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelayMs ?? 200;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if (attempt === maxRetries || !isRetryableStripeError(err)) {
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function isRetryableStripeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e.type === 'StripeConnectionError') return true;
  if (e.type === 'StripeAPIError') return true;
  if (e.type === 'StripeRateLimitError') return true;
  const status = (e.statusCode ?? e.status) as number | undefined;
  if (status && (status === 429 || status >= 500)) return true;
  return false;
}
