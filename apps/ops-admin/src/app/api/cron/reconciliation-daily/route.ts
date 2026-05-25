import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

async function run(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const day = new Date().toISOString().slice(0, 10);
  const runKey = `reconciliation-daily:${day}`;

  try {
    const client = createAdminClient();
    const engine = createCentralEngine(client);
    const summary = await engine.reconciliation.runDaily(day);
    return NextResponse.json({ success: true, data: summary, runKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${runKey}] Failed:`, err);
    return NextResponse.json({ success: false, error: message, runKey }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
