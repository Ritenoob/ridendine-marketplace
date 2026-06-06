const apps = {
  customer: {
    name: 'Customer Web',
    baseUrlEnv: 'RIDENDINE_CUSTOMER_URL',
    defaultBaseUrl: 'https://ridendine.ca',
    loginPath: '/api/auth/login',
    appOwnedLogin: true,
  },
  chef: {
    name: 'Chef Admin',
    baseUrlEnv: 'RIDENDINE_CHEF_URL',
    defaultBaseUrl: 'https://chef.ridendine.ca',
    loginPath: null,
    appOwnedLogin: false,
  },
  driver: {
    name: 'Driver App',
    baseUrlEnv: 'RIDENDINE_DRIVER_URL',
    defaultBaseUrl: 'https://driver.ridendine.ca',
    loginPath: '/api/auth/login',
    appOwnedLogin: true,
  },
  ops: {
    name: 'Ops Admin',
    baseUrlEnv: 'RIDENDINE_OPS_URL',
    defaultBaseUrl: 'https://ops.ridendine.ca',
    loginPath: '/api/auth/login',
    appOwnedLogin: true,
  },
};

function pageContract(app, path, sourcePath, authIntent, extra = {}) {
  const options = typeof extra === 'string' ? { note: extra } : extra;
  return {
    kind: 'page',
    app,
    path,
    sourcePath,
    authIntent,
    expect: options.expect || (authIntent === 'public' ? 'html' : 'login-guard'),
    redirectedTo: options.redirectedTo || null,
    note: options.note || '',
  };
}

function apiContract(app, path, authIntent, extra = {}) {
  return {
    kind: 'api',
    app,
    path,
    authIntent,
    expect: 'json',
    allowedStatuses: extra.allowedStatuses || (authIntent === 'public' ? [200] : [401, 403, 404, 405, 307, 308]),
    authenticated: Boolean(extra.authenticated),
    note: extra.note || '',
  };
}

const authIntentPages = [
  pageContract('customer', '/account/favorites', 'apps/web/src/app/account/favorites/page.tsx', 'protected'),
  pageContract('customer', '/account', 'apps/web/src/app/account/page.tsx', 'protected'),
  pageContract('customer', '/cart', 'apps/web/src/app/cart/page.tsx', 'public', 'Cart is intentionally browsable before login.'),
  pageContract('customer', '/chef-resources', 'apps/web/src/app/chef-resources/page.tsx', 'public'),
  pageContract('customer', '/chefs', 'apps/web/src/app/chefs/page.tsx', 'public'),
  pageContract('customer', '/how-it-works', 'apps/web/src/app/how-it-works/page.tsx', 'public'),
  pageContract('customer', '/maintenance', 'apps/web/src/app/maintenance/page.tsx', 'public'),
  pageContract(
    'customer',
    '/order-confirmation/phase-9-smoke-order',
    'apps/web/src/app/order-confirmation/[orderId]/page.tsx',
    'public',
    {
      expect: 'redirect',
      redirectedTo: '/orders/phase-9-smoke-order/confirmation',
      note: 'Legacy route is a public redirect shim; canonical /orders/:id/confirmation is protected.',
    }
  ),

  pageContract('ops', '/dashboard/chefs', 'apps/ops-admin/src/app/dashboard/chefs/page.tsx', 'protected'),
  pageContract(
    'ops',
    '/dashboard/customers/phase-9-smoke-customer',
    'apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx',
    'protected',
    'Uses a synthetic id; unauthenticated access should resolve to login.'
  ),
  pageContract(
    'ops',
    '/dashboard/deliveries/phase-9-smoke-delivery',
    'apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx',
    'protected',
    'Uses a synthetic id; unauthenticated access should resolve to login.'
  ),
  pageContract(
    'ops',
    '/dashboard/drivers/phase-9-smoke-driver',
    'apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx',
    'protected',
    'Uses a synthetic id; unauthenticated access should resolve to login.'
  ),
  pageContract('ops', '/dashboard/drivers', 'apps/ops-admin/src/app/dashboard/drivers/page.tsx', 'protected'),
  pageContract('ops', '/dashboard/map', 'apps/ops-admin/src/app/dashboard/map/page.tsx', 'protected'),
  pageContract('ops', '/dashboard/reports', 'apps/ops-admin/src/app/dashboard/reports/page.tsx', 'protected'),
  pageContract('ops', '/internal/command-center', 'apps/ops-admin/src/app/internal/command-center/page.tsx', 'protected'),

  pageContract('chef', '/dashboard/availability', 'apps/chef-admin/src/app/dashboard/availability/page.tsx', 'protected'),
];

const publicJsonApis = [
  apiContract('customer', '/api/health', 'public'),
  apiContract('chef', '/api/health', 'public'),
  apiContract('driver', '/api/health', 'public'),
  apiContract('ops', '/api/health', 'public'),
  apiContract('customer', '/api/storefronts?limit=1', 'public'),
  apiContract('customer', '/api/storefronts?featured=true&limit=1', 'public'),
  apiContract('customer', '/api/eta', 'public', {
    allowedStatuses: [200, 400],
    note: 'Missing query params may return a JSON validation error; the contract verifies JSON, not data availability.',
  }),
];

const protectedJsonApis = [
  apiContract('customer', '/api/profile', 'protected', { authenticated: true }),
  apiContract('customer', '/api/orders', 'protected', { authenticated: true }),
  apiContract('customer', '/api/loyalty', 'protected', { authenticated: true }),
  apiContract('driver', '/api/driver', 'protected', { authenticated: true }),
  apiContract('driver', '/api/deliveries', 'protected', { authenticated: true }),
  apiContract('driver', '/api/offers', 'protected', { authenticated: true }),
  apiContract('driver', '/api/earnings', 'protected', { authenticated: true }),
  apiContract('ops', '/api/engine/health', 'protected', { authenticated: true }),
  apiContract('ops', '/api/ops/live-board', 'protected', { authenticated: true }),
  apiContract('ops', '/api/orders', 'protected', { authenticated: true }),
  apiContract('ops', '/api/drivers', 'protected', { authenticated: true }),
  apiContract('ops', '/api/chefs', 'protected', { authenticated: true }),
  apiContract('chef', '/api/storefront', 'protected', {
    note: 'Chef app uses client-side Supabase auth, so Phase 9 only proves unauthenticated rejection.',
  }),
];

const allRuntimeContracts = [...authIntentPages, ...publicJsonApis, ...protectedJsonApis];

module.exports = {
  apps,
  authIntentPages,
  publicJsonApis,
  protectedJsonApis,
  allRuntimeContracts,
};
