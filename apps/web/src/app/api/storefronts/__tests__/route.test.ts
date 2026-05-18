/**
 * @jest-environment node
 */

const mockCreateAdminClient = jest.fn();
const mockGetActiveStorefronts = jest.fn();
const mockSearchStorefronts = jest.fn();
const mockGetStorefrontBySlug = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => mockCreateAdminClient(),
  getActiveStorefronts: (...args: unknown[]) => mockGetActiveStorefronts(...args),
  searchStorefronts: (...args: unknown[]) => mockSearchStorefronts(...args),
  getStorefrontBySlug: (...args: unknown[]) => mockGetStorefrontBySlug(...args),
}));

jest.mock('@/lib/engine', () => ({
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
}));

import { GET as GET_LIST } from '../route';
import { GET as GET_DETAIL } from '../[id]/route';

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sf-1',
    slug: 'chef-amy',
    name: "Amy's Kitchen",
    description: 'Home-style Thai food',
    cuisine_types: ['thai'],
    cover_image_url: 'https://example.com/cover.jpg',
    logo_url: 'https://example.com/logo.jpg',
    average_rating: 4.6,
    total_reviews: 22,
    min_order_amount: 15,
    estimated_prep_time_min: 20,
    estimated_prep_time_max: 35,
    accepting_orders: true,
    is_featured: true,
    chef_profiles: { id: 'chef-1', display_name: 'Amy', profile_image_url: 'https://example.com/amy.jpg' },
    chef_availability: [],
    user_id: 'should-not-leak',
    internal_notes: 'should-not-leak',
    ...overrides,
  };
}

describe('GET /api/storefronts (list)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdminClient.mockReturnValue({ id: 'admin' });
  });

  it('returns a public-mapped list and never leaks internal fields', async () => {
    mockGetActiveStorefronts.mockResolvedValue([buildRow()]);

    const res = await GET_LIST(new Request('http://localhost/api/storefronts'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.storefronts).toHaveLength(1);
    const first = body.data.storefronts[0];
    expect(first).toEqual(
      expect.objectContaining({
        id: 'sf-1',
        slug: 'chef-amy',
        name: "Amy's Kitchen",
        cuisineTypes: ['thai'],
        chef: expect.objectContaining({ displayName: 'Amy' }),
      }),
    );
    expect(first).not.toHaveProperty('user_id');
    expect(first).not.toHaveProperty('internal_notes');
  });

  it('uses searchStorefronts when q is supplied', async () => {
    mockSearchStorefronts.mockResolvedValue([buildRow()]);

    const res = await GET_LIST(new Request('http://localhost/api/storefronts?q=thai'));
    expect(res.status).toBe(200);
    expect(mockSearchStorefronts).toHaveBeenCalled();
    expect(mockGetActiveStorefronts).not.toHaveBeenCalled();
  });
});

describe('GET /api/storefronts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
        }),
      }),
    });
  });

  it('returns 404 when no storefront matches', async () => {
    mockGetStorefrontBySlug.mockResolvedValue(null);
    const params = { params: Promise.resolve({ id: 'missing' }) };
    const res = await GET_DETAIL(new Request('http://localhost/api/storefronts/missing'), params);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns a public-mapped storefront when found by slug', async () => {
    mockGetStorefrontBySlug.mockResolvedValue(buildRow());
    const params = { params: Promise.resolve({ id: 'chef-amy' }) };
    const res = await GET_DETAIL(new Request('http://localhost/api/storefronts/chef-amy'), params);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.storefront).toEqual(
      expect.objectContaining({
        slug: 'chef-amy',
        chef: expect.objectContaining({ displayName: 'Amy' }),
      }),
    );
    expect(body.data.storefront).not.toHaveProperty('user_id');
  });
});
