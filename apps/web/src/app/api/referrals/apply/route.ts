// ==========================================
// REFERRAL APPLY ROUTE
// POST /api/referrals/apply
// Called after signup to link a referral code to the new user
// ==========================================

import { createAdminClient, createServerClient, type SupabaseClient } from '@ridendine/db';
import { createReferralService } from '@ridendine/engine';
import { cookies } from 'next/headers';
import { errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/referrals/apply
 * Body: { code: string, userType: 'customer' | 'chef' }
 * Applies a referral code for the currently authenticated user.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const { code, userType = 'customer' } = body as { code: string; userType?: string };

    if (!code || typeof code !== 'string') {
      return errorResponse('INVALID_INPUT', 'Referral code is required', 400);
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const svc = createReferralService(adminClient);

    const signup = await svc.applyReferralCode(code.trim().toUpperCase(), user.id, userType);

    return successResponse({ signup });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply referral code';
    const status = message.includes('not found') || message.includes('inactive') ? 400 : 500;
    return errorResponse('REFERRAL_APPLY_ERROR', message, status);
  }
}
