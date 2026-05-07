import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  geocodeAddress,
  isWithinDeliveryZone,
  geocodingCache,
} from './geocoding.service';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('geocodeAddress', () => {
  beforeEach(() => {
    geocodingCache.clear();
    mockFetch.mockReset();
  });

  it('returns lat/lng for a valid address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '43.2557', lon: '-79.8711' }],
    });

    const result = await geocodeAddress('1 Main St, Hamilton, ON');
    expect(result).toEqual({ latitude: 43.2557, longitude: -79.8711 });
  });

  it('returns null when nominatim returns empty array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await geocodeAddress('99999 Nonexistent Rd');
    expect(result).toBeNull();
  });

  it('returns null on network error (graceful fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await geocodeAddress('Some address');
    expect(result).toBeNull();
  });

  it('caches results to avoid duplicate requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '43.2557', lon: '-79.8711' }],
    });

    await geocodeAddress('1 Main St, Hamilton, ON');
    await geocodeAddress('1 Main St, Hamilton, ON');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets correct User-Agent header as required by Nominatim ToS', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: '43.2557', lon: '-79.8711' }],
    });

    await geocodeAddress('1 Main St, Hamilton, ON');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toContain('Ridendine');
  });

  it('returns null when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await geocodeAddress('Some address');
    expect(result).toBeNull();
  });
});

describe('isWithinDeliveryZone', () => {
  it('returns true for Hamilton city center coordinates', async () => {
    const result = await isWithinDeliveryZone(43.2557, -79.8711);
    expect(result).toBe(true);
  });

  it('returns true for coordinates within 25km of Hamilton', async () => {
    // Burlington, ON — about 15km from Hamilton
    const result = await isWithinDeliveryZone(43.3255, -79.7990);
    expect(result).toBe(true);
  });

  it('returns false for coordinates outside delivery zone', async () => {
    // Toronto — about 70km from Hamilton
    const result = await isWithinDeliveryZone(43.6532, -79.3832);
    expect(result).toBe(false);
  });

  it('returns false for completely wrong coordinates', async () => {
    // London, UK
    const result = await isWithinDeliveryZone(51.5074, -0.1278);
    expect(result).toBe(false);
  });
});
