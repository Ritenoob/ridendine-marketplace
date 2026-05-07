import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { OsrmProvider, EtaService } from '@ridendine/routing';

export const dynamic = 'force-dynamic';

const FALLBACK = { minMinutes: 30, maxMinutes: 45, prepTime: 20, driveTime: 0 };

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storefrontId = searchParams.get('storefrontId');
  const addressId = searchParams.get('addressId');

  if (!storefrontId) return badRequest('storefrontId is required');
  if (!addressId) return badRequest('addressId is required');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const provider = new OsrmProvider();
    const service = new EtaService(provider, db);

    const eta = await service.estimatePreOrder(storefrontId, addressId);
    return NextResponse.json(eta);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
