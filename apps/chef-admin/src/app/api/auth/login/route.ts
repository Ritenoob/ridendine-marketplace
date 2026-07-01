import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getChefByUserId } from '@ridendine/db';
import { loginSchema } from '@ridendine/validation';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
}

export async function POST(request: Request) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.auth,
    namespace: 'chef-auth-login',
    routeKey: 'POST:/api/auth/login',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const chef = await getChefByUserId(supabase, authData.user.id);
    if (!chef) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Chef profile not found' },
        { status: 403 }
      );
    }

    if (chef.status !== 'approved') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Chef account is not approved yet' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        chef,
        session: authData.session,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
