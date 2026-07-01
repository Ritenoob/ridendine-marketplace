import type { SupabaseClient } from '../client/types';
import type { DriverComplianceDocumentInput } from '@ridendine/types';

export const DRIVER_READINESS_ACTIVE_DELIVERY_STATUSES = [
  'assigned',
  'accepted',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'picked_up',
  'en_route_to_dropoff',
  'arrived_at_dropoff',
  'en_route_to_customer',
  'arrived_at_customer',
] as const;

export type DriverReadinessQueryResult<T> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type DriverReadinessRow = {
  id: string;
  status: string | null;
  instant_payouts_enabled: boolean | null;
};

export type DriverReadinessPresenceRow = {
  status: string | null;
  last_location_at: string | null;
  last_location_update: string | null;
};

export type DriverReadinessPayoutAccountRow = {
  status: string | null;
  payouts_enabled: boolean | null;
  onboarding_completed_at: string | null;
};

export type DriverReadinessPlatformAccountRow = {
  balance_cents: number | null;
};

export type DriverReadinessDocumentRow = DriverComplianceDocumentInput & {
  status: string | null;
  document_type: string | null;
  expires_at: string | null;
};

export type DriverReadinessRawDataResults = {
  driverResult: DriverReadinessQueryResult<DriverReadinessRow>;
  presenceResult: DriverReadinessQueryResult<DriverReadinessPresenceRow>;
  activeDeliveriesResult: DriverReadinessQueryResult<Array<{ id: string }>>;
  payoutAccountResult: DriverReadinessQueryResult<DriverReadinessPayoutAccountRow>;
  complianceDocumentsResult: DriverReadinessQueryResult<DriverReadinessDocumentRow[]>;
  platformAccountResult: DriverReadinessQueryResult<DriverReadinessPlatformAccountRow>;
};

export async function getDriverReadinessRawData(
  client: SupabaseClient,
  driverId: string
): Promise<DriverReadinessRawDataResults> {
  const [
    driverResult,
    presenceResult,
    activeDeliveriesResult,
    payoutAccountResult,
    complianceDocumentsResult,
    platformAccountResult,
  ] = await Promise.all([
    client
      .from('drivers')
      .select('id,status,instant_payouts_enabled')
      .eq('id', driverId)
      .single(),
    client
      .from('driver_presence')
      .select('status,last_location_at,last_location_update')
      .eq('driver_id', driverId)
      .maybeSingle(),
    client
      .from('deliveries')
      .select('id,status')
      .eq('driver_id', driverId)
      .in('status', DRIVER_READINESS_ACTIVE_DELIVERY_STATUSES as unknown as string[]),
    client
      .from('driver_payout_accounts')
      .select('id,status,payouts_enabled,onboarding_completed_at')
      .eq('driver_id', driverId)
      .maybeSingle(),
    client
      .from('driver_documents')
      .select('id,status,document_type,expires_at')
      .eq('driver_id', driverId),
    client
      .from('platform_accounts')
      .select('balance_cents')
      .eq('owner_id', driverId)
      .eq('account_type', 'driver_payable')
      .maybeSingle(),
  ]);

  return {
    driverResult: driverResult as unknown as DriverReadinessQueryResult<DriverReadinessRow>,
    presenceResult: presenceResult as unknown as DriverReadinessQueryResult<DriverReadinessPresenceRow>,
    activeDeliveriesResult: activeDeliveriesResult as unknown as DriverReadinessQueryResult<Array<{ id: string }>>,
    payoutAccountResult: payoutAccountResult as unknown as DriverReadinessQueryResult<DriverReadinessPayoutAccountRow>,
    complianceDocumentsResult: complianceDocumentsResult as unknown as DriverReadinessQueryResult<DriverReadinessDocumentRow[]>,
    platformAccountResult: platformAccountResult as unknown as DriverReadinessQueryResult<DriverReadinessPlatformAccountRow>,
  };
}
