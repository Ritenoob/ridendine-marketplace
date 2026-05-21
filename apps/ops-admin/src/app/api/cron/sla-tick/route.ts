import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const replacement = '/api/engine/processors/sla';

function retiredRouteResponse() {
  return NextResponse.json(
    {
      success: false,
      code: 'DEPRECATED_CRON_ROUTE',
      error: 'This legacy SLA cron route is retired. Use the canonical processor route.',
      replacement,
    },
    { status: 410 }
  );
}

export async function GET(_request: NextRequest) {
  return retiredRouteResponse();
}

export async function POST(_request: NextRequest) {
  return retiredRouteResponse();
}
