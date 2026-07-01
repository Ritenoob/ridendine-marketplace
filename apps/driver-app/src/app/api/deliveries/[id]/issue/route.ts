import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  createDriverDeliveryIssue,
  getDriverDeliveryOrderRef,
  type SupabaseClient,
} from '@ridendine/db';
import { driverDeliveryIssueSchema } from '@ridendine/validation';
import {
  getDriverActorContext,
  verifyDriverOwnsDelivery,
  errorResponse,
  successResponse,
} from '@/lib/engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ISSUE_LABELS: Record<string, string> = {
  chef_delay: 'Chef delay',
  customer_unavailable: 'Customer unavailable',
  damaged_package: 'Damaged package',
  unsafe_route: 'Unsafe route',
  driver_emergency: 'Driver emergency',
  wrong_address: 'Wrong address',
  unable_to_complete: 'Unable to complete delivery',
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: deliveryId } = await params;
  const driverContext = await getDriverActorContext();
  if (!driverContext) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
  }

  const ownsDelivery = await verifyDriverOwnsDelivery(driverContext.driverId, deliveryId);
  if (!ownsDelivery) {
    return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
  }

  const validation = driverDeliveryIssueSchema.safeParse(await request.json());
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues[0]?.message || 'Invalid delivery issue',
      400
    );
  }

  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const { data: delivery } = await getDriverDeliveryOrderRef(adminClient, deliveryId);
  if (!delivery) {
    return errorResponse('NOT_FOUND', 'Delivery not found', 404);
  }

  const label = ISSUE_LABELS[validation.data.issueType];
  const { data: issue, error } = await createDriverDeliveryIssue(adminClient, {
    exceptionType: `delivery_${validation.data.issueType}`,
    severity: validation.data.issueType === 'driver_emergency' ? 'high' : 'medium',
    orderId: delivery.order_id,
    driverId: driverContext.driverId,
    deliveryId,
    title: `Driver reported: ${label}`,
    description: validation.data.notes,
    internalNotes: {
      reportedBy: 'driver',
      lat: validation.data.lat ?? null,
      lng: validation.data.lng ?? null,
    },
  });

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to report delivery issue', 500);
  }

  return successResponse({ issue }, 201);
}
