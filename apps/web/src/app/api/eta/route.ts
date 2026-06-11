import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { OsrmProvider, EtaService } from '@ridendine/routing';
import { getCustomerActorContext } from '@/lib/engine';

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

  // Address-based ETAs are only used by authenticated surfaces (checkout), and
  // this handler uses the RLS-bypassing admin client — so require a customer
  // session and verify the address belongs to the caller before computing.
  const customerContext = await getCustomerActorContext();
  if (!customerContext) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = createAdminClient() as any;

  const { data: address, error: addressError } = await db
    .from('customer_addresses')
    .select('id')
    .eq('id', addressId)
    .eq('customer_id', customerContext.customerId)
    .maybeSingle();

  if (addressError || !address) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  try {
    const provider = new OsrmProvider();
    const service = new EtaService(provider, db);

    const eta = await service.estimatePreOrder(storefrontId, addressId);
    return NextResponse.json(eta);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
