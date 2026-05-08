import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  createServerClient,
  getStorefrontByChefId,
  getOrdersByStorefront,
  getMenuItemsByStorefront,
  getMenuCategoriesByStorefront,
} from '@ridendine/db';
import type { Tables } from '@ridendine/db';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  ListChecks,
  Package,
  Store,
  Utensils,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type OrderRow = Awaited<ReturnType<typeof getOrdersByStorefront>>[number] & {
  customer?: { first_name: string | null; last_name: string | null } | null;
};

type MenuItemRow = Awaited<ReturnType<typeof getMenuItemsByStorefront>>[number];
type StorefrontRow = Awaited<ReturnType<typeof getStorefrontByChefId>>;
type ChefProfile = Pick<Tables<'chef_profiles'>, 'id' | 'display_name' | 'status' | 'phone' | 'bio'>;

const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup'];
const URGENT_ORDER_STATUSES = ['pending', 'accepted', 'preparing'];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  accepted: 'bg-blue-50 text-blue-800 border border-blue-200',
  preparing: 'bg-purple-50 text-purple-800 border border-purple-200',
  ready_for_pickup: 'bg-green-50 text-green-800 border border-green-200',
  picked_up: 'bg-teal-50 text-teal-800 border border-teal-200',
  delivered: 'bg-gray-50 text-gray-700 border border-gray-200',
  cancelled: 'bg-red-50 text-red-800 border border-red-200',
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function getOrderAge(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(createdAt)) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

async function getChefContext(): Promise<{
  chef: ChefProfile | null;
  storefront: StorefrontRow;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { chef: null, storefront: null };

    const { data: chef, error } = await supabase
      .from('chef_profiles')
      .select('id, display_name, status, phone, bio')
      .eq('user_id', user.id)
      .single();

    if (error || !chef) return { chef: null, storefront: null };
    const storefront = await getStorefrontByChefId(supabase as any, chef.id);
    return { chef: chef as ChefProfile, storefront };
  } catch {
    return { chef: null, storefront: null };
  }
}

async function hasStripeAccount(chefId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data } = await supabase
      .from('chef_payout_accounts')
      .select('stripe_account_id')
      .eq('chef_id', chefId)
      .maybeSingle();
    return Boolean(data?.stripe_account_id);
  } catch {
    return false;
  }
}

async function getAvailabilitySummary(storefrontId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data } = await supabase
      .from('chef_availability')
      .select('day_of_week, is_available')
      .eq('storefront_id', storefrontId);
    const rows = data ?? [];
    return {
      configuredDays: rows.length,
      openDays: rows.filter((row: { is_available: boolean }) => row.is_available).length,
    };
  } catch {
    return { configuredDays: 0, openDays: 0 };
  }
}

async function getDashboardData(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let allOrders: OrderRow[] = [];
  let menuItems: MenuItemRow[] = [];
  let menuCategories: Awaited<ReturnType<typeof getMenuCategoriesByStorefront>> = [];

  try {
    allOrders = (await getOrdersByStorefront(supabase as any, storefrontId)) as OrderRow[];
  } catch {
    allOrders = [];
  }

  try {
    menuItems = await getMenuItemsByStorefront(supabase as any, storefrontId, { includeUnavailable: true });
    menuCategories = await getMenuCategoriesByStorefront(supabase as any, storefrontId);
  } catch {
    menuItems = [];
    menuCategories = [];
  }

  const recentOrders = allOrders.slice(0, 8);
  const urgentOrders = allOrders.filter((order) => URGENT_ORDER_STATUSES.includes(order.status)).slice(0, 5);
  const customerIds = [
    ...new Set([...recentOrders, ...urgentOrders].map((order) => order.customer_id).filter(Boolean)),
  ];
  let customers: Array<{ id: string; first_name: string | null; last_name: string | null }> = [];
  if (customerIds.length > 0) {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', customerIds);
      customers = data ?? [];
    } catch {
      customers = [];
    }
  }

  const activeOrders = allOrders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const readyOrders = allOrders.filter((order) => order.status === 'ready_for_pickup');
  const todayOrders = allOrders.filter((order) => new Date(order.created_at) >= today);
  const monthOrders = allOrders.filter((order) => new Date(order.created_at) >= monthStart);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const withCustomer = (order: OrderRow): OrderRow => ({
    ...order,
    customer: customers.find((customer) => customer.id === order.customer_id) ?? null,
  });

  return {
    stats: {
      activeOrders: activeOrders.length,
      urgentOrders: urgentOrders.length,
      readyOrders: readyOrders.length,
      todayRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
    },
    recentOrders: recentOrders.map(withCustomer),
    urgentOrders: urgentOrders.map(withCustomer),
    menu: {
      total: menuItems.length,
      available: menuItems.filter((item) => item.is_available && !item.is_sold_out).length,
      soldOut: menuItems.filter((item) => item.is_sold_out).length,
      missingImages: menuItems.filter((item) => !item.image_url).length,
      missingDescriptions: menuItems.filter((item) => !item.description).length,
      limited: menuItems.filter((item) => item.daily_limit != null).length,
      categories: menuCategories.length,
    },
  };
}

function buildReadiness({
  chef,
  storefront,
  stripeConnected,
  availability,
  menu,
}: {
  chef: ChefProfile | null;
  storefront: NonNullable<StorefrontRow>;
  stripeConnected: boolean;
  availability: { configuredDays: number; openDays: number };
  menu: Awaited<ReturnType<typeof getDashboardData>>['menu'];
}) {
  return [
    {
      label: 'Ops approval',
      ready: chef?.status === 'approved',
      detail: chef?.status === 'approved' ? 'Chef profile approved' : `Profile status: ${chef?.status ?? 'missing'}`,
      href: '/dashboard/settings',
    },
    {
      label: 'Storefront visibility',
      ready: storefront.is_active && !storefront.is_paused,
      detail: storefront.is_paused
        ? storefront.paused_reason || 'Paused by ops'
        : storefront.is_active
          ? 'Visible to customers'
          : 'Waiting for ops publication',
      href: '/dashboard/storefront',
    },
    {
      label: 'Menu ready',
      ready: menu.available > 0 && menu.categories > 0,
      detail: `${menu.available} available items across ${menu.categories} categories`,
      href: '/dashboard/menu',
    },
    {
      label: 'Images and descriptions',
      ready: menu.total > 0 && menu.missingImages === 0 && menu.missingDescriptions === 0,
      detail: `${menu.missingImages} missing images, ${menu.missingDescriptions} missing descriptions`,
      href: '/dashboard/menu',
    },
    {
      label: 'Hours configured',
      ready: availability.openDays > 0,
      detail: `${availability.openDays} open days configured`,
      href: '/dashboard/availability',
    },
    {
      label: 'Payout setup',
      ready: stripeConnected,
      detail: stripeConnected ? 'Stripe payout account connected' : 'Stripe payout setup required',
      href: '/dashboard/payouts',
    },
  ];
}

function EmptyStorefront() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <Store className="h-8 w-8 text-[#E85D26]" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set up your storefront</h2>
        <p className="mt-1 max-w-md text-gray-500">
          Your chef dashboard starts with a storefront. Add your business details, prep times, hours, and menu so ops can review and publish it.
        </p>
      </div>
      <Link
        href="/dashboard/storefront"
        className="rounded-xl bg-[#E85D26] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d44e1e]"
      >
        Set Up Storefront
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const { chef, storefront } = await getChefContext();

  if (!storefront) return <EmptyStorefront />;

  const [dashboard, stripeConnected, availability] = await Promise.all([
    getDashboardData(storefront.id),
    chef ? hasStripeAccount(chef.id) : Promise.resolve(false),
    getAvailabilitySummary(storefront.id),
  ]);

  const readiness = buildReadiness({
    chef,
    storefront,
    stripeConnected,
    availability,
    menu: dashboard.menu,
  });
  const readinessComplete = readiness.filter((item) => item.ready).length;

  const statCards = [
    {
      label: 'Active Orders',
      value: dashboard.stats.activeOrders,
      detail: `${dashboard.stats.readyOrders} ready for pickup`,
      icon: ListChecks,
      accent: 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Today Revenue',
      value: money(dashboard.stats.todayRevenue),
      detail: `${dashboard.stats.monthOrders} orders this month`,
      icon: DollarSign,
      accent: 'text-[#E85D26] bg-orange-50',
    },
    {
      label: 'Menu Availability',
      value: `${dashboard.menu.available}/${dashboard.menu.total}`,
      detail: `${dashboard.menu.soldOut} sold out, ${dashboard.menu.limited} limited`,
      icon: Utensils,
      accent: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: 'Storefront Status',
      value: storefront.is_paused ? 'Paused' : storefront.is_active ? 'Live' : 'Draft',
      detail: chef?.status === 'approved' ? 'Chef approved' : 'Needs ops approval',
      icon: Store,
      accent: 'text-purple-700 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {!stripeConnected && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-950">Connect Stripe to receive payouts</p>
              <p className="text-xs text-amber-800">Payout readiness is shared with ops-admin so finance can monitor chef payments.</p>
            </div>
          </div>
          <Link
            href="/dashboard/payouts"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Open Payouts
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#E85D26]">Chef Command Center</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">{storefront.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Run today&apos;s orders, menu availability, storefront readiness, and payout setup from one place. Ops-admin sees the same
              core business state, so chef updates and platform monitoring stay aligned.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/menu"
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d44e1e]"
            >
              Edit Menu
            </Link>
            <Link
              href="/dashboard/orders"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-[#E85D26]/40"
            >
              View Orders
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-950">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-950">Today&apos;s Order Flow</h2>
              <p className="mt-1 text-xs text-gray-500">Accept, prepare, and mark ready from the orders workspace.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-[#E85D26] hover:text-[#d44e1e]">
              Open orders
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {dashboard.urgentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-sm font-semibold text-gray-900">No orders need action right now</p>
                <p className="mt-1 text-xs text-gray-500">New orders and prep tasks will appear here as they arrive.</p>
              </div>
            ) : (
              dashboard.urgentOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-gray-950">#{order.order_number}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customer ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() : 'Customer order'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {getOrderAge(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-950">{money(order.total)}</p>
                    <Link
                      href="/dashboard/orders"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-[#E85D26]/40"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-950">Business Readiness</h2>
                <p className="mt-1 text-xs text-gray-500">{readinessComplete} of {readiness.length} checks complete</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {Math.round((readinessComplete / readiness.length) * 100)}%
              </span>
            </div>
          </div>
          <div className="space-y-3 p-5">
            {readiness.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-[#E85D26]/30"
              >
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-950">{item.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                </div>
                <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-950">Menu Operations</h2>
              <p className="mt-1 text-xs text-gray-500">Availability, images, descriptions, and daily limits.</p>
            </div>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ['Available', dashboard.menu.available],
              ['Sold out', dashboard.menu.soldOut],
              ['Missing images', dashboard.menu.missingImages],
              ['Missing descriptions', dashboard.menu.missingDescriptions],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-gray-950">{value}</p>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/menu"
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Manage Menu
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-950">Recent Orders</h2>
              <p className="mt-1 text-xs text-gray-500">Latest customer orders for this storefront.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-[#E85D26] hover:text-[#d44e1e]">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            {dashboard.recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-gray-700">No orders yet</p>
                <p className="mt-1 text-xs text-gray-500">Orders will appear here once customers start ordering.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboard.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-gray-950">#{order.order_number}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {order.customer ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() : 'Guest'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-950">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
