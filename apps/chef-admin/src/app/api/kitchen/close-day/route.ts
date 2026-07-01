// ==========================================
// CHEF-ADMIN KITCHEN API — close of day (Stage 12)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { closeDaySchema } from '@ridendine/validation';
import { computeLaborTotals, type TimeEntryLike } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface OrderRow {
  total: number | null;
  status: string;
  created_at: string;
  prep_started_at: string | null;
  actual_ready_at: string | null;
  estimated_ready_at: string | null;
  order_items: { quantity: number; menu_item: { name: string } | null }[];
}

/**
 * POST /api/kitchen/close-day
 * Aggregate the day and upsert a saved summary. Passing { reopen: true } marks
 * the existing summary reopened (it can be closed again). Does not block active
 * orders — closing is a reporting action.
 */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-close-day',
      userId: chefContext.actor.userId,
      routeKey: 'POST:/api/kitchen/close-day',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = closeDaySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }
    const storefrontId = chefContext.storefrontId;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const now = new Date();
    const summaryDate = parsed.data.date ?? kitchenDateKey(now);

    // Reopen: flag the existing summary and stop.
    if (parsed.data.reopen) {
      const { data: reopened, error } = await admin
        .from('kitchen_daily_summaries')
        .update({ reopened_at: now.toISOString() })
        .eq('storefront_id', storefrontId)
        .eq('summary_date', summaryDate)
        .select('*')
        .maybeSingle();
      if (error) {
        console.error('Reopen summary error:', error);
        return errorResponse('INTERNAL_ERROR', 'Failed to reopen summary', 500);
      }
      if (!reopened) return errorResponse('NOT_FOUND', 'No summary to reopen for that date', 404);
      return successResponse({ summary: reopened, reopened: true });
    }

    // Window generously around the date, then filter by kitchen-tz calendar day.
    const dayStart = new Date(`${summaryDate}T00:00:00Z`);
    const from = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const to = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000).toISOString();

    const [ordersResult, entriesResult, wasteResult, menuResult] = await Promise.all([
      admin
        .from('orders')
        .select('total, status, created_at, prep_started_at, actual_ready_at, estimated_ready_at, order_items ( quantity, menu_item:menu_items ( name ) )')
        .eq('storefront_id', storefrontId)
        .neq('is_test', true)
        .gte('created_at', from)
        .lte('created_at', to),
      admin
        .from('time_entries')
        .select('id, staff_id, clock_in, clock_out, hourly_rate')
        .eq('storefront_id', storefrontId)
        .gte('clock_in', from)
        .lte('clock_in', to),
      admin
        .from('inventory_waste_events')
        .select('cost_value, created_at')
        .eq('storefront_id', storefrontId)
        .gte('created_at', from)
        .lte('created_at', to),
      admin.from('menu_items').select('name, is_sold_out').eq('storefront_id', storefrontId),
    ]);

    const sameDay = (ts: string | null | undefined) =>
      Boolean(ts) && kitchenDateKey(new Date(ts as string)) === summaryDate;

    const allOrders = (ordersResult.data ?? []) as unknown as OrderRow[];
    const dayOrders = allOrders.filter((o) => sameDay(o.created_at));
    const completed = dayOrders.filter((o) => o.status === 'delivered' || o.status === 'completed');

    const grossSales = completed.reduce((s, o) => s + Number(o.total ?? 0), 0);

    // Average actual prep minutes.
    const prepDurations = completed
      .filter((o) => o.prep_started_at && o.actual_ready_at)
      .map((o) => (Date.parse(o.actual_ready_at as string) - Date.parse(o.prep_started_at as string)) / 60000)
      .filter((m) => Number.isFinite(m) && m >= 0);
    const avgPrep = prepDurations.length > 0 ? prepDurations.reduce((s, m) => s + m, 0) / prepDurations.length : null;

    // Late tickets: active-day orders whose promised time passed with no ready stamp.
    const lateTickets = dayOrders.filter(
      (o) =>
        ['pending', 'accepted', 'preparing'].includes(o.status) &&
        !o.actual_ready_at &&
        o.estimated_ready_at &&
        Date.parse(o.estimated_ready_at) < now.getTime()
    ).length;

    // Top sellers.
    const qtyByItem = new Map<string, number>();
    for (const o of completed) {
      for (const oi of o.order_items ?? []) {
        const name = oi.menu_item?.name;
        if (!name) continue;
        qtyByItem.set(name, (qtyByItem.get(name) ?? 0) + Number(oi.quantity ?? 0));
      }
    }
    const topSellers = [...qtyByItem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    const entries = (entriesResult.data ?? []).filter((e) => !e.clock_out || sameDay(e.clock_in)) as TimeEntryLike[];
    const laborCost = round2(computeLaborTotals(entries, now).totalCost);

    const wasteValue = round2(
      (wasteResult.data ?? [])
        .filter((w) => sameDay(w.created_at))
        .reduce((s, w) => s + Number(w.cost_value ?? 0), 0)
    );

    const soldOutItems = (menuResult.data ?? [])
      .filter((m) => m.is_sold_out)
      .map((m) => m.name);

    const primeCost = laborCost; // food cost not yet available; labour only.

    const row = {
      storefront_id: storefrontId,
      summary_date: summaryDate,
      orders_completed: completed.length,
      gross_sales: round2(grossSales),
      net_sales: round2(grossSales),
      labor_cost: laborCost,
      waste_value: wasteValue,
      prime_cost: primeCost,
      avg_prep_minutes: avgPrep === null ? null : round2(avgPrep),
      late_tickets: lateTickets,
      top_sellers: topSellers,
      sold_out_items: soldOutItems,
      notes: parsed.data.notes ?? null,
      closed_by: chefContext.actor.userId,
      closed_at: now.toISOString(),
      reopened_at: null,
    };

    const { data: summary, error } = await admin
      .from('kitchen_daily_summaries')
      .upsert(row, { onConflict: 'storefront_id,summary_date' })
      .select('*')
      .single();

    if (error || !summary) {
      console.error('Close-day upsert error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to save summary', 500);
    }

    return successResponse({ summary }, 201);
  } catch (error) {
    console.error('Error closing day:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
