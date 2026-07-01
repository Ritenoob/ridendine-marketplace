import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createAdminClient,
  createServerClient,
  getDeliveryById,
  getDriverDeliveryOrderDetail,
  getDriverByUserId,
  getPendingAssignmentAttemptRefForDriver,
  type SupabaseClient,
} from '@ridendine/db';
import { isApprovedDriver } from '@/lib/driver-eligibility';
import { DriverShell } from '@/components/layout/driver-shell';
import DeliveryDetail from './components/DeliveryDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DeliveryOrderRow {
  order_number: string;
  customer_phone?: string | null;
  special_instructions?: string | null;
  [key: string]: unknown;
}

export default async function ActiveDeliveryPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const driver = await getDriverByUserId(supabase, user.id);

  if (!isApprovedDriver(driver)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Driver access unavailable</h2>
          <p className="mt-2 text-textMuted">
            Your account must be approved before you can open deliveries.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const delivery = await getDeliveryById(admin as unknown as SupabaseClient, id);

  if (!delivery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Delivery not found</h2>
          <p className="mt-2 text-textMuted">This delivery doesn&apos;t exist or has been removed</p>
        </div>
      </div>
    );
  }

  const assignedToMe = delivery.driver_id === driver.id;
  let hasPendingOffer = false;
  if (!assignedToMe) {
    const { data: attempt } = await getPendingAssignmentAttemptRefForDriver(
      admin as unknown as SupabaseClient,
      id,
      driver.id
    );
    hasPendingOffer = !!attempt;
  }

  if (!assignedToMe && !hasPendingOffer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Delivery not found</h2>
          <p className="mt-2 text-textMuted">This delivery is not assigned to you</p>
        </div>
      </div>
    );
  }

  const { data: order } = await getDriverDeliveryOrderDetail(
    admin as unknown as SupabaseClient,
    delivery.order_id
  );

  const orderRow = (order as DeliveryOrderRow | null) ?? null;

  return (
    <DriverShell
      title="Active Delivery"
      subtitle={orderRow?.order_number ? `Order ${orderRow.order_number}` : 'Delivery workflow'}
      statusLabel="Live"
      statusTone="success"
      fullBleed
      showBottomNav={false}
    >
      <DeliveryDetail delivery={delivery} order={orderRow} />
    </DriverShell>
  );
}
