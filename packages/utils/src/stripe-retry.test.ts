import { describe, expect, it, vi } from 'vitest';
import { withStripeRetry } from './stripe-retry';

describe('withStripeRetry', () => {
  it('returns result immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withStripeRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on non-retryable error', async () => {
    const err = { type: 'StripeCardError', statusCode: 402 };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toEqual(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on StripeConnectionError and eventually succeeds', async () => {
    const connectionErr = { type: 'StripeConnectionError' };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(connectionErr)
      .mockRejectedValueOnce(connectionErr)
      .mockResolvedValue('success');
    const result = await withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on StripeRateLimitError', async () => {
    const rateErr = { type: 'StripeRateLimitError' };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateErr)
      .mockResolvedValue('done');
    const result = await withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on StripeAPIError', async () => {
    const apiErr = { type: 'StripeAPIError' };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(apiErr)
      .mockResolvedValue('done');
    const result = await withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on HTTP 429 status', async () => {
    const err = { statusCode: 429 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    const result = await withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on HTTP 503 status via status field', async () => {
    const err = { status: 503 };
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    const result = await withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries and throws last error', async () => {
    const connectionErr = { type: 'StripeConnectionError' };
    const fn = vi.fn().mockRejectedValue(connectionErr);
    await expect(withStripeRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toEqual(connectionErr);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('uses default maxRetries of 3', async () => {
    const connectionErr = { type: 'StripeConnectionError' };
    const fn = vi.fn().mockRejectedValue(connectionErr);
    await expect(withStripeRetry(fn, { baseDelayMs: 1 })).rejects.toEqual(connectionErr);
    expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it('does not retry on null error', async () => {
    const fn = vi.fn().mockRejectedValue(null);
    await expect(withStripeRetry(fn, { maxRetries: 3, baseDelayMs: 1 })).rejects.toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
