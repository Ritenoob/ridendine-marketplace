export type ControlCenterAreaKey =
  | 'live-ops'
  | 'engine-health'
  | 'dispatch'
  | 'orders'
  | 'chefs'
  | 'drivers'
  | 'customers'
  | 'finance'
  | 'promos'
  | 'support'
  | 'team'
  | 'settings';

export type ControlCenterTone = 'critical' | 'warning' | 'healthy' | 'neutral';

export interface ControlCenterArea {
  key: ControlCenterAreaKey;
  title: string;
  href: string;
  purpose: string;
  apiRoutes: string[];
  signals: string[];
  actions: string[];
  destructiveDelete: boolean;
  tone: ControlCenterTone;
}

export interface ControlCenterSummary {
  totalAreas: number;
  wiredAreas: number;
  totalActions: number;
  destructiveDeleteAreas: string[];
}

export const CONTROL_CENTER_AREAS: ControlCenterArea[] = [
  {
    key: 'live-ops',
    title: 'Live Ops',
    href: '/dashboard',
    purpose: 'Monitor active orders, drivers, chefs, SLA pressure, and the internal delivery map.',
    apiRoutes: ['/api/ops/live-board', '/api/engine/dashboard'],
    signals: ['Realtime board', 'SLA flags', 'Driver pins', 'Engine pressure'],
    actions: ['Open order', 'Open delivery', 'Open dispatch', 'Open finance'],
    destructiveDelete: false,
    tone: 'healthy',
  },
  {
    key: 'engine-health',
    title: 'Engine Health',
    href: '/dashboard/settings',
    purpose: 'Check platform health, maintenance mode, processor status, rules, and operational settings.',
    apiRoutes: ['/api/engine/health', '/api/engine/maintenance', '/api/engine/rules', '/api/engine/settings'],
    signals: ['System health', 'Maintenance mode', 'Rules configured', 'Processor endpoints'],
    actions: ['Toggle maintenance', 'Edit rules', 'Run processor checks'],
    destructiveDelete: false,
    tone: 'warning',
  },
  {
    key: 'dispatch',
    title: 'Dispatch',
    href: '/dashboard/dispatch',
    purpose: 'Assign, reassign, and force-assign deliveries with audited reasons.',
    apiRoutes: ['/api/engine/dispatch', '/api/engine/dispatch/offer-history'],
    signals: ['Pending dispatch', 'Active deliveries', 'Escalations', 'Offer history'],
    actions: ['Force assign', 'Reassign driver', 'Expire offers', 'Escalate to ops'],
    destructiveDelete: false,
    tone: 'critical',
  },
  {
    key: 'orders',
    title: 'Orders',
    href: '/dashboard/orders',
    purpose: 'Inspect order lifecycle and apply audited status, cancellation, and refund actions.',
    apiRoutes: ['/api/orders', '/api/orders/[id]', '/api/engine/orders/[id]', '/api/orders/[id]/refund'],
    signals: ['Engine status', 'Payment status', 'Customer', 'Storefront'],
    actions: ['Update status', 'Cancel order', 'Request refund', 'Open audit trail'],
    destructiveDelete: false,
    tone: 'critical',
  },
  {
    key: 'chefs',
    title: 'Chefs',
    href: '/dashboard/chefs',
    purpose: 'Govern chef onboarding, approvals, storefront state, pause controls, and capacity.',
    apiRoutes: ['/api/chefs', '/api/chefs/[id]', '/api/engine/storefronts/[id]'],
    signals: ['Approval queue', 'Storefront state', 'Queue size', 'Overload'],
    actions: ['Add chef', 'Approve chef', 'Suspend chef', 'Pause storefront', 'Edit capacity'],
    destructiveDelete: false,
    tone: 'warning',
  },
  {
    key: 'drivers',
    title: 'Drivers',
    href: '/dashboard/drivers',
    purpose: 'Govern driver onboarding, availability, location freshness, and delivery assignment readiness.',
    apiRoutes: ['/api/drivers', '/api/drivers/[id]'],
    signals: ['Approval state', 'Presence', 'Active load', 'Location freshness'],
    actions: ['Add driver', 'Approve driver', 'Suspend driver', 'Open deliveries'],
    destructiveDelete: false,
    tone: 'warning',
  },
  {
    key: 'customers',
    title: 'Customers',
    href: '/dashboard/customers',
    purpose: 'View customer profiles, orders, support state, and notification actions.',
    apiRoutes: ['/api/customers', '/api/customers/[id]/notify'],
    signals: ['Customer status', 'Order history', 'Support notes'],
    actions: ['Add customer', 'Edit customer', 'Notify customer', 'Open orders'],
    destructiveDelete: false,
    tone: 'neutral',
  },
  {
    key: 'finance',
    title: 'Finance',
    href: '/dashboard/finance',
    purpose: 'Monitor ledger, refunds, payouts, reconciliation, accounts, and instant payout queue.',
    apiRoutes: ['/api/engine/finance', '/api/engine/refunds', '/api/engine/payouts', '/api/engine/reconciliation'],
    signals: ['Refund queue', 'Payout runs', 'Ledger balance', 'Reconciliation status'],
    actions: ['Request refund', 'Preview payouts', 'Execute payout', 'Run reconciliation'],
    destructiveDelete: false,
    tone: 'critical',
  },
  {
    key: 'promos',
    title: 'Promos',
    href: '/dashboard/promos',
    purpose: 'Create and manage operational promotions and offer controls.',
    apiRoutes: ['/api/promos'],
    signals: ['Active promos', 'Usage', 'Expiration'],
    actions: ['Add promo', 'Edit promo', 'Deactivate promo'],
    destructiveDelete: false,
    tone: 'neutral',
  },
  {
    key: 'support',
    title: 'Support',
    href: '/dashboard/support',
    purpose: 'Manage support tickets, exception handling, and customer/driver/chef follow-up.',
    apiRoutes: ['/api/support', '/api/support/[id]', '/api/engine/exceptions', '/api/engine/exceptions/[id]'],
    signals: ['Open tickets', 'Exceptions', 'Priority', 'Owner'],
    actions: ['Create ticket', 'Assign ticket', 'Resolve ticket', 'Resolve exception'],
    destructiveDelete: false,
    tone: 'warning',
  },
  {
    key: 'team',
    title: 'Team',
    href: '/dashboard/team',
    purpose: 'Manage platform staff, roles, access, and active operator status.',
    apiRoutes: ['/api/team'],
    signals: ['Role', 'Active state', 'Last update'],
    actions: ['Add teammate', 'Edit role', 'Deactivate teammate'],
    destructiveDelete: false,
    tone: 'neutral',
  },
  {
    key: 'settings',
    title: 'Settings',
    href: '/dashboard/settings',
    purpose: 'Configure platform rules, maintenance, dispatch tuning, fees, and safety thresholds.',
    apiRoutes: ['/api/engine/settings', '/api/engine/rules', '/api/surge'],
    signals: ['Maintenance', 'Dispatch rules', 'Surge settings', 'Platform settings'],
    actions: ['Edit settings', 'Edit rules', 'Edit surge controls'],
    destructiveDelete: false,
    tone: 'neutral',
  },
];

export function getControlCenterSummary(
  areas: ControlCenterArea[] = CONTROL_CENTER_AREAS
): ControlCenterSummary {
  return {
    totalAreas: areas.length,
    wiredAreas: areas.filter((area) => area.href && area.apiRoutes.length > 0).length,
    totalActions: areas.reduce((sum, area) => sum + area.actions.length, 0),
    destructiveDeleteAreas: areas
      .filter((area) => area.destructiveDelete)
      .map((area) => area.key),
  };
}
