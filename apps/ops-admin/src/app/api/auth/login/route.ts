import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, createAdminClient } from '@ridendine/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

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
    const adminClient = createAdminClient();
    const { data: platformUser } = await (adminClient as any)
      .from('platform_users')
      .select('id, role')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .single();

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
