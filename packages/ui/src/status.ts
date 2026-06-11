// ==========================================
// STATUS DISPLAY MAPS (single source of truth)
// ==========================================
//
// Canonical display labels and Tailwind badge classes for order and delivery
// statuses. These were previously duplicated (and drifting) across
// chef-admin, ops-admin, and driver-app. Apps may keep their own fallback
// behaviour for unknown statuses, but the per-status strings live here.

/**
 * Human-readable labels for `orders.status` values.
 * Source: chef-admin orders list (the only label map that existed for orders).
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  delivered: 'Delivered',
};

/**
 * Soft badge classes for `orders.status` (light-theme apps, e.g. chef-admin).
 * Pair with `rounded-full px-2.5 py-0.5 text-xs font-medium` at the call site.
 */
export const ORDER_STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'bg-warningSoft text-warning border border-warning/30',
  accepted: 'bg-infoSoft text-info border border-info/30',
  preparing: 'bg-infoSoft text-info border border-info/30',
  ready_for_pickup: 'bg-successSoft text-success border border-success/30',
  picked_up: 'bg-accentSoft text-accent border border-accent/30',
  delivered: 'bg-surfaceMuted text-text border border-border',
  cancelled: 'bg-dangerSoft text-danger border border-danger/30',
  rejected: 'bg-dangerSoft text-danger border border-danger/30',
};

/**
 * Solid background classes for `orders.status` (dark-theme ops-admin).
 * `bg-info` for ready_for_pickup / picked_up is the canonical (recently
 * fixed) color for in-flight statuses.
 */
export const ORDER_STATUS_BG_CLASSES: Record<string, string> = {
  pending: 'bg-warning',
  accepted: 'bg-info',
  preparing: 'bg-info',
  ready_for_pickup: 'bg-info',
  picked_up: 'bg-info',
  delivered: 'bg-success',
  cancelled: 'bg-danger',
  refunded: 'bg-surfaceMuted',
};

/**
 * Human-readable labels for `deliveries.status` values as shown to drivers.
 * Source: driver-app dashboard + delivery workflow (labels were identical).
 */
export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route_to_pickup: 'En route to pickup',
  arrived_at_pickup: 'At restaurant',
  picked_up: 'Picked up',
  en_route_to_dropoff: 'En route to customer',
  arrived_at_dropoff: 'At customer',
};
