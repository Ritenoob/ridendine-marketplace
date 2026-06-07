# Runtime Proof Disposition

Generated: 2026-06-07T21:15:53.119Z

This Phase 20/21 proof disposition audit assigns every remaining runtime proof gap to an explicit next proof action. It does not make new production calls or mutate data; it converts the remaining proof gaps into actionable buckets for future safe smoke, negative authorization, sample-data, or contract-only work.

## Summary

| Surface | Total discovered | Proof covered | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|---:|---:|
| Pages | 90 | 80 | 10 | 10 | 0 |
| API route handlers | 120 | 116 | 4 | 4 | 0 |

## Page Proof Gap Disposition

| App | Route | File | Auth intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Chef Admin | `/dashboard/orders/[id]` | `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | mixed-auth-dependent | public-shell-and-auth-action-smoke | public-shell-and-auth-action-smoke |
| Customer Web | `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | public | public-page-smoke | public-page-smoke |
| Customer Web | `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Driver App | `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/chefs/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/accounts/drivers/[id]` | `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/finance/payouts/[runId]` | `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |
| Ops Admin | `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | protected | sampled-login-guard-page-smoke | sampled-login-guard-page-smoke |

## API Proof Gap Disposition

| App | Endpoint | File | Guard intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Customer Web | `/api/orders/[id]/payment-status` | `apps/web/src/app/api/orders/[id]/payment-status/route.ts` | protected-session | sampled-authenticated-json-smoke | sampled-authenticated-json-smoke |
| Customer Web | `/api/storefronts/[id]` | `apps/web/src/app/api/storefronts/[id]/route.ts` | public-read | public-json-smoke | public-json-smoke |
| Customer Web | `/api/storefronts/[id]/menu` | `apps/web/src/app/api/storefronts/[id]/menu/route.ts` | public-read | public-json-smoke | public-json-smoke |
| Customer Web | `/api/support/tickets/[id]` | `apps/web/src/app/api/support/tickets/[id]/route.ts` | protected-session | sampled-authenticated-json-smoke | sampled-authenticated-json-smoke |

## Failures

None found.
