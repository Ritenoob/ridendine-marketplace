const WIRED = 'WIRED';

function page(auth, dataSource, extra = {}) {
  return {
    status: WIRED,
    auth,
    dataSource,
    intent: extra.intent || dataSource,
    apis: extra.apis || [],
    tables: extra.tables || [],
    packages: extra.packages || [],
    components: extra.components || [],
    notes: extra.notes || '',
  };
}

function api(auth, request, response, extra = {}) {
  return {
    status: WIRED,
    auth,
    request,
    response,
    intent: extra.intent || response,
    tables: extra.tables || [],
    packages: extra.packages || [],
    external: extra.external || [],
    notes: extra.notes || '',
  };
}

const pageContracts = {
  'apps/web/src/app/account/addresses/page.tsx': page(
    'Customer protected',
    'Customer address management via account layout and address APIs',
    { apis: ['/api/addresses', '/api/addresses?id=${id}'], tables: ['customer_addresses'] }
  ),
  'apps/web/src/app/account/orders/page.tsx': page(
    'Customer protected',
    'Customer order history and reorder flow via cart/order APIs',
    { apis: ['/api/cart', '/api/orders', '/api/orders/${order.id}'], tables: ['orders', 'order_items'] }
  ),
  'apps/web/src/app/account/settings/page.tsx': page(
    'Customer protected',
    'Customer profile settings via profile API',
    { apis: ['/api/profile'], tables: ['customers'] }
  ),
  'apps/web/src/app/auth/forgot-password/page.tsx': page(
    'Public auth',
    'Public password reset request surface',
    { packages: ['@ridendine/auth'] }
  ),
  'apps/web/src/app/auth/login/page.tsx': page(
    'Public auth',
    'Public customer login surface wired to app-owned login API',
    { apis: ['/api/auth/login'] }
  ),
  'apps/web/src/app/auth/signup/page.tsx': page(
    'Public auth',
    'Public customer signup surface with referral application path',
    { apis: ['/api/referrals/apply'], packages: ['@ridendine/auth'] }
  ),
  'apps/web/src/app/checkout/page.tsx': page(
    'Customer protected',
    'Customer checkout surface with addresses, cart, and checkout APIs',
    { apis: ['/api/addresses', '/api/cart?storefrontId=${storefrontId}', '/api/checkout'], tables: ['carts', 'orders'] }
  ),
  'apps/web/src/app/chef-signup/page.tsx': page(
    'Public marketplace',
    'Public chef acquisition and signup information page'
  ),
  'apps/web/src/app/contact/page.tsx': page(
    'Public support',
    'Public contact form wired to support API',
    { apis: ['/api/support'], tables: ['support_tickets'] }
  ),

  'apps/ops-admin/src/app/auth/login/page.tsx': page(
    'Public auth',
    'Public ops login surface wired to app-owned login API',
    { apis: ['/api/auth/login'] }
  ),
  'apps/ops-admin/src/app/dashboard/analytics/page.tsx': page(
    'Ops protected',
    'Ops analytics dashboard reading operational metrics',
    { tables: ['driver_presence', 'drivers', 'orders'] }
  ),
  'apps/ops-admin/src/app/dashboard/announcements/page.tsx': page(
    'Ops protected',
    'Ops announcements management surface',
    { apis: ['/api/announcements'] }
  ),
  'apps/ops-admin/src/app/dashboard/automation/page.tsx': page(
    'Ops protected',
    'Ops automation rules surface',
    { apis: ['/api/engine/rules'] }
  ),
  'apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx': page(
    'Ops protected',
    'Ops chef approval workflow surface',
    { apis: ['/api/chefs', '/api/chefs/${id}'], tables: ['chef_profiles'] }
  ),
  'apps/ops-admin/src/app/dashboard/customers/page.tsx': page(
    'Ops protected',
    'Ops customer management surface',
    { apis: ['/api/customers'], tables: ['customers'] }
  ),
  'apps/ops-admin/src/app/dashboard/deliveries/page.tsx': page(
    'Ops protected',
    'Ops delivery management surface',
    { tables: ['deliveries', 'drivers', 'orders'] }
  ),
  'apps/ops-admin/src/app/dashboard/dispatch/page.tsx': page(
    'Ops protected',
    'Ops dispatch control surface',
    { apis: ['/api/engine/dispatch', '/api/engine/dispatch/offer-history'], tables: ['delivery_offers', 'deliveries'] }
  ),
  'apps/ops-admin/src/app/dashboard/orders/page.tsx': page(
    'Ops protected',
    'Ops order search and action surface',
    { apis: ['/api/engine/orders/${orderId}', '/api/orders'], tables: ['orders'] }
  ),
  'apps/ops-admin/src/app/dashboard/promos/page.tsx': page(
    'Ops protected',
    'Ops promotions management surface',
    { tables: ['promo_codes'] }
  ),
  'apps/ops-admin/src/app/dashboard/support/page.tsx': page(
    'Ops protected',
    'Ops support case surface',
    { tables: ['support_tickets'] }
  ),
  'apps/ops-admin/src/app/dashboard/team/page.tsx': page(
    'Ops protected',
    'Ops team and platform-user management surface',
    { tables: ['platform_users'] }
  ),

  'apps/chef-admin/src/app/auth/forgot-password/page.tsx': page(
    'Public auth',
    'Public chef password reset request surface',
    { packages: ['@ridendine/auth'] }
  ),
  'apps/chef-admin/src/app/auth/login/page.tsx': page(
    'Public auth',
    'Public chef login surface wired to app-owned login API',
    { apis: ['/api/auth/login'] }
  ),
  'apps/chef-admin/src/app/auth/signup/page.tsx': page(
    'Public auth',
    'Public chef signup surface wired to chef signup API',
    { apis: ['/api/auth/signup'] }
  ),
  'apps/chef-admin/src/app/dashboard/analytics/page.tsx': page(
    'Chef protected',
    'Chef analytics dashboard wired to analytics API',
    { apis: ['/api/analytics?period=${p}'], tables: ['orders', 'chef_storefronts'] }
  ),
  'apps/chef-admin/src/app/dashboard/reviews/page.tsx': page(
    'Chef protected',
    'Chef review management surface',
    { tables: ['chef_profiles', 'chef_storefronts', 'reviews'] }
  ),

  'apps/driver-app/src/app/auth/login/page.tsx': page(
    'Public auth',
    'Public driver login surface wired to app-owned login API',
    { apis: ['/api/auth/login'] }
  ),
  'apps/driver-app/src/app/auth/signup/page.tsx': page(
    'Public auth',
    'Public driver signup surface wired to driver signup API',
    { apis: ['/api/auth/signup'] }
  ),
};

const apiContracts = {
  'apps/web/src/app/api/eta/route.ts': api(
    'Public marketplace read',
    'Query params: storefrontId and addressId are required',
    'JSON ETA window only; falls back to a safe default if routing fails',
    { packages: ['@ridendine/db', '@ridendine/routing'], external: ['Routing provider'], notes: 'Read-only customer ETA quote route; no address payload is returned.' }
  ),
  'apps/web/src/app/api/health/route.ts': api(
    'Public health check',
    'No request body',
    'JSON operational health payload',
    { tables: ['chef_storefronts'], packages: ['@ridendine/db', '@ridendine/utils'], external: ['Stripe', 'Supabase'] }
  ),
  'apps/web/src/app/api/storefronts/route.ts': api(
    'Public marketplace read',
    'Optional discovery query params: q, limit, offset, sortBy, cuisine, featured',
    'JSON public storefront summaries',
    { packages: ['@ridendine/db'], tables: ['chef_storefronts'] }
  ),
  'apps/web/src/app/api/storefronts/[id]/route.ts': api(
    'Public marketplace read',
    'Route param: storefront slug or id',
    'JSON public storefront detail',
    { packages: ['@ridendine/db'], tables: ['chef_storefronts'] }
  ),
  'apps/web/src/app/api/storefronts/[id]/menu/route.ts': api(
    'Public marketplace read',
    'Route param: active storefront id',
    'JSON public menu categories, available items, and item options',
    { packages: ['@ridendine/db'], tables: ['chef_storefronts', 'menu_item_options', 'menu_items'] }
  ),
  'apps/ops-admin/src/app/api/health/route.ts': api(
    'Public health check',
    'No request body',
    'JSON ops operational health payload and table probes',
    {
      packages: ['@ridendine/db', '@ridendine/utils'],
      tables: ['chef_profiles', 'customers', 'deliveries', 'driver_presence', 'drivers', 'orders'],
      external: ['Stripe', 'Supabase'],
    }
  ),
  'apps/chef-admin/src/app/api/health/route.ts': api(
    'Public health check',
    'No request body',
    'JSON chef-admin operational health payload',
    { packages: ['@ridendine/db', '@ridendine/utils'], tables: ['chef_profiles'], external: ['Stripe', 'Supabase'] }
  ),
  'apps/chef-admin/src/app/api/storefront/route.ts': api(
    'Chef protected',
    'GET has no body; POST/PATCH accept chef storefront settings',
    'JSON chef storefront payload or validation/error envelope',
    { packages: ['@ridendine/db'], tables: ['chef_kitchens', 'chef_storefronts'], external: ['Supabase'] }
  ),
  'apps/driver-app/src/app/api/health/route.ts': api(
    'Public health check',
    'No request body',
    'JSON driver-app operational health payload',
    { packages: ['@ridendine/db', '@ridendine/utils'], tables: ['drivers'], external: ['Stripe', 'Supabase'] }
  ),
};

module.exports = {
  pageContracts,
  apiContracts,
};
