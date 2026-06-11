import { describe, expect, it, vi } from 'vitest';
import { TaxConfigService, createTaxConfigService } from './tax-config.service';
import { HST_RATE, SERVICE_FEE_PERCENT } from '../constants';

function buildClient(opts: {
  data?: { hst_rate?: number | null; service_fee_percent?: number | null } | null;
  error?: { message: string } | null;
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: opts.data ?? null,
        error: opts.error ?? null,
      }),
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('TaxConfigService', () => {
  it('reads hstRate and serviceFeePercent from the DB row', async () => {
    const client = buildClient({ data: { hst_rate: 15, service_fee_percent: 10 } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(15);
    expect(rates.serviceFeePercent).toBe(10);
  });

  it('applies DB rates over constants when both differ from defaults', async () => {
    const client = buildClient({ data: { hst_rate: HST_RATE + 2, service_fee_percent: SERVICE_FEE_PERCENT + 1 } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).not.toBe(HST_RATE);
    expect(rates.serviceFeePercent).not.toBe(SERVICE_FEE_PERCENT);
  });

  it('accepts a zero rate from the DB (zero is a valid configured value, not a fallback trigger)', async () => {
    const client = buildClient({ data: { hst_rate: 0, service_fee_percent: 0 } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(0);
    expect(rates.serviceFeePercent).toBe(0);
  });

  it('falls back per-field when a column is null or missing', async () => {
    const client = buildClient({ data: { hst_rate: 14, service_fee_percent: null } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(14);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
  });

  it('returns defaults when DB returns an error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = buildClient({ data: null, error: { message: 'RLS denied' } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns defaults when DB returns null data (missing row)', async () => {
    const client = buildClient({ data: null, error: null });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
  });

  it('caches results within the 60-second TTL — does not re-hit DB on repeated calls', async () => {
    const client = buildClient({ data: { hst_rate: 12, service_fee_percent: 9 } });
    const svc = new TaxConfigService(client);

    const first = await svc.getTaxRates();
    const second = await svc.getTaxRates();
    const third = await svc.getTaxRates();

    expect(first).toEqual(second);
    expect(second).toEqual(third);
    // DB should be queried exactly once thanks to cache
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('caches fallback defaults after a DB error (errors are not retried within TTL)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = buildClient({ data: null, error: { message: 'down' } });
    const svc = new TaxConfigService(client);

    await svc.getTaxRates();
    await svc.getTaxRates();

    expect(client.from).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('re-fetches after cache TTL expires', async () => {
    const client = buildClient({ data: { hst_rate: 13, service_fee_percent: 8 } });
    const svc = new TaxConfigService(client);

    // Populate cache
    await svc.getTaxRates();

    // Force cache expiry by back-dating it
    (svc as unknown as { cache: { expiresAt: number } }).cache!.expiresAt = Date.now() - 1;

    await svc.getTaxRates();

    // DB should be queried twice: once for initial load, once after expiry
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it('returns defaults when DB throws unexpectedly', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      from: vi.fn(() => {
        throw new Error('network timeout');
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const svc = new TaxConfigService(client);
    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
    warnSpy.mockRestore();
  });

  it('createTaxConfigService returns a working TaxConfigService instance', async () => {
    const client = buildClient({ data: { hst_rate: 11, service_fee_percent: 7 } });
    const svc = createTaxConfigService(client);

    expect(svc).toBeInstanceOf(TaxConfigService);
    await expect(svc.getTaxRates()).resolves.toEqual({ hstRate: 11, serviceFeePercent: 7 });
  });
});
