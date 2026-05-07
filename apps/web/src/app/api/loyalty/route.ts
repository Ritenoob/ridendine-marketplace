// ==========================================
// LOYALTY API ROUTE
// GET  /api/loyalty — customer balance + recent transactions
// POST /api/loyalty — redeem points
// ==========================================

import { createAdminClient } from '@ridendine/db';
import { createLoyaltyService } from '@ridendine/engine';
import { getCustomerActorContext, errorResponse, successResponse } from '@/lib/engine';

const MAX_RECENT_TRANSACTIONS = 10;

export async function GET(): Promise<Response> {
  const ctx = await getCustomerActorContext();
  if (!ctx) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  try {
    const adminClient = createAdminClient() as any;
    const loyaltyService = createLoyaltyService(adminClient);

    const balance = await loyaltyService.getBalance(ctx.customerId);

    // Fetch recent transactions via admin client
    const { data: transactions } = await adminClient
      .from('loyalty_transactions')
      .select('id, points, type, description, order_id, created_at')
      .eq('loyalty_account_id', (await loyaltyService.getOrCreateAccount(ctx.customerId)).id)
      .order('created_at', { ascending: false })
      .limit(MAX_RECENT_TRANSACTIONS);

    return successResponse({
      ...balance,
      recentTransactions: transactions ?? [],
    });
  } catch (error) {
    console.error('Loyalty GET error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch loyalty data', 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  const ctx = await getCustomerActorContext();
  if (!ctx) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  try {
    const body = await request.json();
    const points = Number(body?.points);

    if (!Number.isInteger(points) || points <= 0) {
      return errorResponse('VALIDATION_ERROR', 'points must be a positive integer', 400);
    }

    const adminClient = createAdminClient() as any;
    const loyaltyService = createLoyaltyService(adminClient);
    const result = await loyaltyService.redeemPoints(ctx.customerId, points);

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient points')) {
      return errorResponse('INSUFFICIENT_POINTS', error.message, 400);
    }
    console.error('Loyalty POST error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to redeem points', 500);
  }
}
