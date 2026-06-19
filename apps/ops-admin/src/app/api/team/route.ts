import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  insertPlatformUser,
  listPlatformUsers,
  updatePlatformUser,
  type SupabaseClient,
} from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

async function checkRateLimit(request: NextRequest, actor: { userId: string } | null, method: 'post' | 'patch') {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.opsAdminMutation,
    namespace: `ops-team-${method}`,
    userId: actor?.userId ?? 'unknown',
    routeKey: `${method.toUpperCase()}:/api/team`,
  });
  return limit.allowed ? null : rateLimitPolicyResponse(limit);
}

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'team_list');
  if (denied) return denied;

  const client = createAdminClient() as unknown as SupabaseClient;
  try {
    const data = await listPlatformUsers(client);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load team' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'team_manage');
  if (denied) return denied;
  const limited = await checkRateLimit(request, actor, 'post');
  if (limited) return limited;

  const { email, name, role, password } = await request.json();
  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'email, name, role, and password required' }, { status: 400 });
  }

  const validRoles = [
    'ops_admin',
    'ops_agent',
    'ops_manager',
    'finance_admin',
    'finance_manager',
    'super_admin',
    'support',
    'support_agent',
  ];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Use: ${validRoles.join(', ')}` }, { status: 400 });
  }

  const client = createAdminClient() as unknown as SupabaseClient;

  // Create auth user via admin API
  const { data: authData, error: authError } = await (client as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Create platform_users record
  try {
    await insertPlatformUser(client, {
      user_id: authData.user.id,
      email,
      name,
      role,
      is_active: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create platform user' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { userId: authData.user.id, email, name, role } });
}

export async function PATCH(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'team_manage');
  if (denied) return denied;
  const limited = await checkRateLimit(request, actor, 'patch');
  if (limited) return limited;

  const { id, role, is_active } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = createAdminClient() as unknown as SupabaseClient;
  const update: { role?: string; is_active?: boolean } = {};
  if (role !== undefined) update.role = role;
  if (is_active !== undefined) update.is_active = is_active;

  try {
    await updatePlatformUser(client, id, update);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update platform user' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
