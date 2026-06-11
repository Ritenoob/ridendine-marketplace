import { NextResponse } from 'next/server';
import { createAdminClient, getOpsSupportQueue, createSupportTicket, type SupabaseClient } from '@ridendine/db';
import { supportTicketSchema } from '@ridendine/validation';
import {
  getOpsActorContext,
  guardPlatformApi,
  finalizeOpsActor,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'support_queue');
    const auth = finalizeOpsActor(actor, denied);
    if (auth instanceof Response) return auth;

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const queue = await getOpsSupportQueue(supabase, {
      supportAgentUserId: auth.role === 'support_agent' ? auth.userId : undefined,
    });
    return NextResponse.json({ data: queue });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'support_queue');
    const auth = finalizeOpsActor(actor, denied);
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const parsed = supportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid support ticket payload' },
        { status: 400 }
      );
    }
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const ticket = await createSupportTicket(
      supabase,
      parsed.data as Parameters<typeof createSupportTicket>[1]
    );
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
