// ==========================================
// PARTNER WEBHOOKS PROCESSOR
// Enqueues order-lifecycle events for partners with a registered webhook_url and
// delivers them (HMAC-signed, retried). Intended to run frequently; protected by
// the engine processor token.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { runPartnerWebhookProcessor } from '@/lib/partner-webhooks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = createAdminClient() as unknown as SupabaseClient;
    const result = await runPartnerWebhookProcessor(client, Date.now());
    return NextResponse.json({
      success: true,
      processor: 'partner-webhooks',
      data: { processedAt: new Date().toISOString(), ...result },
    });
  } catch (error) {
    console.error('Partner webhooks processor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Partner webhook processing failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    processor: 'partner-webhooks',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
