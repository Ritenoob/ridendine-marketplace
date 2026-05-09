# Environment Wiring Matrix

Generated from `process.env` and uppercase env references in page/API source files.

| Variable | App | Surface | File | Route/API |
| --- | --- | --- | --- | --- |
| CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED | Customer Web | api | [apps/web/src/app/api/health/route.ts](../../../apps/web/src/app/api/health/route.ts) | `/api/health` |
| ENGINE_PROCESSOR_TOKEN | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| INTERNAL_COMMAND_CENTER_ENABLED | Ops Admin | api | [apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts](../../../apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts) | `/api/internal/command-center/change-requests` |
| INTERNAL_COMMAND_CENTER_ENABLED | Ops Admin | page | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | `/internal/command-center` |
| NEXT_PUBLIC_APP_URL | Chef Admin | api | [apps/chef-admin/src/app/api/payouts/setup/route.ts](../../../apps/chef-admin/src/app/api/payouts/setup/route.ts) | `/api/payouts/setup` |
| NEXT_PUBLIC_APP_URL | Customer Web | page | [apps/web/src/app/chefs/[slug]/page.tsx](../../../apps/web/src/app/chefs/[slug]/page.tsx) | `/chefs/:slug` |
| NEXT_PUBLIC_APP_URL | Driver App | api | [apps/driver-app/src/app/api/payouts/setup/route.ts](../../../apps/driver-app/src/app/api/payouts/setup/route.ts) | `/api/payouts/setup` |
| NEXT_PUBLIC_APP_URL | Ops Admin | page | [apps/ops-admin/src/app/dashboard/health/page.tsx](../../../apps/ops-admin/src/app/dashboard/health/page.tsx) | `/dashboard/health` |
| NEXT_PUBLIC_CHEF_ADMIN_URL | Chef Admin | api | [apps/chef-admin/src/app/api/payouts/setup/route.ts](../../../apps/chef-admin/src/app/api/payouts/setup/route.ts) | `/api/payouts/setup` |
| NEXT_PUBLIC_CHEF_ADMIN_URL | Customer Web | page | [apps/web/src/app/chef-signup/page.tsx](../../../apps/web/src/app/chef-signup/page.tsx) | `/chef-signup` |
| NEXT_PUBLIC_DRIVER_APP_URL | Driver App | api | [apps/driver-app/src/app/api/payouts/setup/route.ts](../../../apps/driver-app/src/app/api/payouts/setup/route.ts) | `/api/payouts/setup` |
| NEXT_PUBLIC_SENTRY_DSN | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Customer Web | page | [apps/web/src/app/checkout/page.tsx](../../../apps/web/src/app/checkout/page.tsx) | `/checkout` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chef Admin | api | [apps/chef-admin/src/app/api/health/route.ts](../../../apps/chef-admin/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Customer Web | api | [apps/web/src/app/api/health/route.ts](../../../apps/web/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Driver App | api | [apps/driver-app/src/app/api/health/route.ts](../../../apps/driver-app/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Ops Admin | api | [apps/ops-admin/src/app/api/health/route.ts](../../../apps/ops-admin/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_URL | Chef Admin | api | [apps/chef-admin/src/app/api/health/route.ts](../../../apps/chef-admin/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_URL | Customer Web | api | [apps/web/src/app/api/health/route.ts](../../../apps/web/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_URL | Driver App | api | [apps/driver-app/src/app/api/health/route.ts](../../../apps/driver-app/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_URL | Ops Admin | api | [apps/ops-admin/src/app/api/health/route.ts](../../../apps/ops-admin/src/app/api/health/route.ts) | `/api/health` |
| NEXT_PUBLIC_SUPABASE_URL | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| NODE_ENV | Ops Admin | api | [apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts](../../../apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts) | `/api/internal/command-center/change-requests` |
| NODE_ENV | Ops Admin | page | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | `/internal/command-center` |
| RESEND_API_KEY | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| STRIPE_SECRET_KEY | Customer Web | api | [apps/web/src/app/api/checkout/route.ts](../../../apps/web/src/app/api/checkout/route.ts) | `/api/checkout` |
| STRIPE_SECRET_KEY | Customer Web | api | [apps/web/src/app/api/health/route.ts](../../../apps/web/src/app/api/health/route.ts) | `/api/health` |
| STRIPE_SECRET_KEY | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| STRIPE_WEBHOOK_SECRET_OPS | Ops Admin | api | [apps/ops-admin/src/app/api/stripe/webhook/route.ts](../../../apps/ops-admin/src/app/api/stripe/webhook/route.ts) | `/api/stripe/webhook` |
| STRIPE_WEBHOOK_SECRET | Customer Web | api | [apps/web/src/app/api/health/route.ts](../../../apps/web/src/app/api/health/route.ts) | `/api/health` |
| STRIPE_WEBHOOK_SECRET | Customer Web | api | [apps/web/src/app/api/webhooks/stripe/route.ts](../../../apps/web/src/app/api/webhooks/stripe/route.ts) | `/api/webhooks/stripe` |
| STRIPE_WEBHOOK_SECRET | Ops Admin | api | [apps/ops-admin/src/app/api/stripe/webhook/route.ts](../../../apps/ops-admin/src/app/api/stripe/webhook/route.ts) | `/api/stripe/webhook` |
| STRIPE_WEBHOOK_SECRET | Ops Admin | page | [apps/ops-admin/src/app/dashboard/integrations/page.tsx](../../../apps/ops-admin/src/app/dashboard/integrations/page.tsx) | `/dashboard/integrations` |
| VERCEL_ENV | Ops Admin | page | [apps/ops-admin/src/app/internal/command-center/page.tsx](../../../apps/ops-admin/src/app/internal/command-center/page.tsx) | `/internal/command-center` |
| VERCEL_URL | Ops Admin | page | [apps/ops-admin/src/app/dashboard/health/page.tsx](../../../apps/ops-admin/src/app/dashboard/health/page.tsx) | `/dashboard/health` |
