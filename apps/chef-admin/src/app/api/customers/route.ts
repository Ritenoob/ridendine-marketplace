import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface OrderRow {
  customer_id: string | null;
  total: number | null;
  created_at: string;
}

interface CustomerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

function customerTier(orderCount: number): 'new' | 'returning' | 'loyal' | 'vip' {
  if (orderCount >= 8) return 'vip';
  if (orderCount >= 4) return 'loyal';
  if (orderCount >= 2) return 'returning';
  return 'new';
}

export async function GET(_request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { storefrontId } = chefContext;
    const adminClient = createAdminClient();

    const { data: orders } = await adminClient
      .from('orders')
      .select('customer_id, total, created_at')
      .eq('storefront_id', storefrontId)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false });

    const rows = (orders ?? []) as OrderRow[];

    if (rows.length === 0) {
      return successResponse({
        customers: [],
        summary: { total: 0, newThisMonth: 0, repeatRate: 0, avgLifetimeValue: 0 },
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Group orders by customer
    const byCustomer: Record<
      string,
      { orderCount: number; totalSpent: number; firstOrder: string; lastOrder: string }
    > = {};

    for (const order of rows) {
      if (!order.customer_id) continue;
      const existing = byCustomer[order.customer_id];
      if (!existing) {
        byCustomer[order.customer_id] = {
          orderCount: 1,
          totalSpent: Number(order.total ?? 0),
          firstOrder: order.created_at,
          lastOrder: order.created_at,
        };
      } else {
        existing.orderCount += 1;
        existing.totalSpent += Number(order.total ?? 0);
        if (order.created_at < existing.firstOrder) existing.firstOrder = order.created_at;
        if (order.created_at > existing.lastOrder) existing.lastOrder = order.created_at;
      }
    }

    const customerIds = Object.keys(byCustomer);

    // Fetch names in one query
    const { data: profiles } = await adminClient
      .from('customers')
      .select('id, first_name, last_name')
      .in('id', customerIds);

    const profileMap = new Map<string, CustomerProfile>(
      ((profiles ?? []) as CustomerProfile[]).map((p) => [p.id, p])
    );

    // Summary stats
    const newThisMonth = customerIds.filter((id) => {
      const c = byCustomer[id]!;
      return new Date(c.firstOrder) >= monthStart;
    }).length;

    const repeatCount = customerIds.filter((id) => (byCustomer[id]?.orderCount ?? 0) >= 2).length;
    const repeatRate = customerIds.length > 0 ? (repeatCount / customerIds.length) * 100 : 0;
    const totalRevenue = Object.values(byCustomer).reduce((s, c) => s + c.totalSpent, 0);
    const avgLifetimeValue = customerIds.length > 0 ? totalRevenue / customerIds.length : 0;

    const customers = customerIds
      .map((id) => {
        const c = byCustomer[id]!;
        const profile = profileMap.get(id);
        const name = profile
          ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Customer'
          : 'Customer';
        return {
          id,
          name,
          orderCount: c.orderCount,
          totalSpent: c.totalSpent,
          avgOrderValue: c.totalSpent / c.orderCount,
          firstOrder: c.firstOrder,
          lastOrder: c.lastOrder,
          tier: customerTier(c.orderCount),
          isNewThisMonth: new Date(c.firstOrder) >= monthStart,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return successResponse({
      customers,
      summary: {
        total: customerIds.length,
        newThisMonth,
        repeatRate,
        avgLifetimeValue,
      },
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
