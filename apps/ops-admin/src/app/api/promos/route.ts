import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createPromoCode,
  deletePromoCode,
  listAllPromoCodes,
  setPromoCodeActive,
  type SupabaseClient,
} from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

async function checkRateLimit(request: NextRequest, actor: { userId: string } | null, method: 'post' | 'patch' | 'delete') {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.opsAdminMutation,
    namespace: `ops-promos-${method}`,
    userId: actor?.userId ?? 'unknown',
    routeKey: `${method.toUpperCase()}:/api/promos`,
  });
  return limit.allowed ? null : rateLimitPolicyResponse(limit);
}

function promoErrorResponse(error: unknown, fallback: string) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 }
  );
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    const data = await listAllPromoCodes(client);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return promoErrorResponse(error, 'Failed to load promo codes');
  }
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;
  const limited = await checkRateLimit(request, actor, 'post');
  if (limited) return limited;

  const body = await request.json();
  const { code, discountType, discountValue, minOrderAmount, usageLimit, startsAt, expiresAt } = body;

  if (!code || !discountType || !discountValue) {
    return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
  }

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    const data = await createPromoCode(client, {
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount || 0,
      usage_limit: usageLimit || null,
      usage_count: 0,
      starts_at: startsAt || null,
      expires_at: expiresAt || null,
      is_active: true,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return promoErrorResponse(error, 'Failed to create promo code');
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;
  const limited = await checkRateLimit(request, actor, 'patch');
  if (limited) return limited;

  const body = await request.json();
  const { id, is_active } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    const data = await setPromoCodeActive(client, id, is_active);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return promoErrorResponse(error, 'Failed to update promo code');
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;
  const limited = await checkRateLimit(request, actor, 'delete');
  if (limited) return limited;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    await deletePromoCode(client, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return promoErrorResponse(error, 'Failed to delete promo code');
  }
}
