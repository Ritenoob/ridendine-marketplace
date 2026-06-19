import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  insertNotifications,
  listAnnouncementAudienceUserIds,
  type AnnouncementAudience,
  type SupabaseClient,
} from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { finalizeOpsActor, getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'announcements'));
  if (opsActor instanceof Response) return opsActor;

  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.opsAdminMutation,
    namespace: 'ops-announcements-post',
    userId: opsActor.userId,
    routeKey: 'POST:/api/announcements',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const { audience, title, body } = await request.json();

  if (!audience || !title || !body) {
    return NextResponse.json({ error: 'audience, title, and body required' }, { status: 400 });
  }

  const validAudiences = ['all_customers', 'all_chefs', 'all_drivers', 'all_ops'];
  if (!validAudiences.includes(audience)) {
    return NextResponse.json({ error: `Invalid audience. Use: ${validAudiences.join(', ')}` }, { status: 400 });
  }

  const client = createAdminClient() as unknown as SupabaseClient;

  try {
    const userIds = await listAnnouncementAudienceUserIds(
      client,
      audience as AnnouncementAudience
    );

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: { sent: 0, audience } });
    }

    // Batch insert notifications (max 100 at a time)
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'announcement',
      title,
      body,
      message: body,
      data: { audience, sentBy: opsActor.userId, sentAt: new Date().toISOString() },
    }));

    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await insertNotifications(client, batch);
    }

    return NextResponse.json({
      success: true,
      data: { sent: userIds.length, audience },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to send',
    }, { status: 500 });
  }
}
