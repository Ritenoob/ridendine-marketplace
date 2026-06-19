import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getActivePlatformUserByUserId,
  type SupabaseClient,
} from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { loginSchema } from '@ridendine/validation';

export async function POST(request: Request) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.auth,
    namespace: 'ops-auth-login',
    routeKey: 'POST:/api/auth/login',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(
      body && typeof body === 'object'
        ? { ...body, email: typeof body.email === 'string' ? body.email.trim() : body.email }
        : body
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Email and password are required' },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify user has a platform_users entry
    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const platformUser = await getActivePlatformUserByUserId(adminClient, authData.user.id);

    if (!platformUser) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Access restricted to authorized personnel only' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        role: platformUser.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sign in failed' },
      { status: 500 }
    );
  }
}
