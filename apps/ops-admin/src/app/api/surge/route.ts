// ==========================================
// OPS ADMIN — SURGE PRICING API
// GET: Current surge multipliers per area
// PATCH: Manually override surge multiplier for an area
// ==========================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { SURGE_CAP } from '@ridendine/engine';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface ServiceAreaRow {
  id: string;
  name: string;
  surge_multiplier: number | null;
  is_active: boolean;
  dispatch_radius_km: number | null;
}

export async function GET() {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'platform_settings');
    if (denied) return denied;

    const adminClient = createAdminClient() as any;
    const { data, error } = await adminClient
      .from('service_areas')
      .select('id, name, surge_multiplier, is_active, dispatch_radius_km')
      .order('name');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch service areas' }, { status: 500 });
    }

    const areas = (data as ServiceAreaRow[]).map((area) => ({
      id: area.id,
      name: area.name,
      surgeMultiplier: area.surge_multiplier ?? 1.0,
      surgeActive: (area.surge_multiplier ?? 1.0) > 1.0,
      isActive: area.is_active,
      dispatchRadiusKm: area.dispatch_radius_km,
    }));

    return NextResponse.json({ success: true, data: areas });
  } catch (err) {
    console.error('[surge] GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'platform_settings');
    if (denied) return denied;

    const body = await request.json() as { serviceAreaId?: string; surgeMultiplier?: number };
    const { serviceAreaId, surgeMultiplier } = body;

    if (!serviceAreaId || typeof serviceAreaId !== 'string') {
      return NextResponse.json({ success: false, error: 'serviceAreaId is required' }, { status: 400 });
    }

    if (surgeMultiplier === undefined || typeof surgeMultiplier !== 'number') {
      return NextResponse.json({ success: false, error: 'surgeMultiplier must be a number' }, { status: 400 });
    }

    if (surgeMultiplier < 1.0 || surgeMultiplier > SURGE_CAP) {
      return NextResponse.json(
        { success: false, error: `surgeMultiplier must be between 1.0 and ${SURGE_CAP}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient() as any;
    const { data, error } = await adminClient
      .from('service_areas')
      .update({ surge_multiplier: surgeMultiplier, updated_at: new Date().toISOString() })
      .eq('id', serviceAreaId)
      .select('id, name, surge_multiplier')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update surge multiplier' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (data as ServiceAreaRow).id,
        name: (data as ServiceAreaRow).name,
        surgeMultiplier: (data as ServiceAreaRow).surge_multiplier ?? 1.0,
      },
    });
  } catch (err) {
    console.error('[surge] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
