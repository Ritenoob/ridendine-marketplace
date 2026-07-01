import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { notificationsTable, createServerClient } from '@ridendine/db';
import { createNotificationSchema, updateNotificationSchema } from '@ridendine/validation';
import { getCustomerActorContext } from '@ridendine/engine/server';

export async function GET(): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: notifications, error } = await notificationsTable(supabase)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ctx = await getCustomerActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid notification payload' },
        { status: 400 }
      );
    }
    const { title, message, type, action_url, user_id } = parsed.data;

    // Allow creating notifications for self or (if admin) for others
    const targetUserId = user_id || user.id;

    const { data: notification, error } = await notificationsTable(supabase)
      .insert({
        user_id: targetUserId,
        title,
        message,
        type: type || 'system',
        action_url,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getCustomerActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid notification payload' },
        { status: 400 }
      );
    }
    const { notification_id, read } = parsed.data;

    if (notification_id) {
      // Mark specific notification as read
      const { error } = await notificationsTable(supabase)
        .update({ read })
        .eq('id', notification_id)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Mark all as read
      const { error } = await notificationsTable(supabase)
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
