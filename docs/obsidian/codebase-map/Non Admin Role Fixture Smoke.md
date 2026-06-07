# Non-Admin Role Fixture Smoke

Generated: 2026-06-07T20:31:35.476Z

This generated smoke matrix verifies read-only live Ops access boundaries for seeded non-admin platform roles when their credentials are supplied. It uses app-owned Ops login, then runs GET probes that should either return 200 JSON for allowed capabilities or 403 JSON for denied capabilities.

## Summary

| Metric | Count |
|---|---:|
| Non-admin roles | 3 |
| Live-safe GET contracts | 15 |
| Passed live probes | 15 |
| Failed checks | 0 |

## Credential Readiness

Credential values are intentionally never printed in this report. This table only records which env var slots are configured for the current run.

| Status | Role | Email env vars | Password env vars | Email configured | Password configured |
|---|---|---|---|---|---|
| READY | support_agent | RIDENDINE_SUPPORT_AGENT_EMAIL, RIDENDINE_SMOKE_SUPPORT_AGENT_EMAIL | RIDENDINE_SUPPORT_AGENT_PASSWORD, RIDENDINE_SMOKE_SUPPORT_AGENT_PASSWORD | Yes | Yes |
| READY | finance_manager | RIDENDINE_FINANCE_MANAGER_EMAIL, RIDENDINE_SMOKE_FINANCE_MANAGER_EMAIL | RIDENDINE_FINANCE_MANAGER_PASSWORD, RIDENDINE_SMOKE_FINANCE_MANAGER_PASSWORD | Yes | Yes |
| READY | ops_agent | RIDENDINE_OPS_AGENT_EMAIL, RIDENDINE_SMOKE_OPS_AGENT_EMAIL | RIDENDINE_OPS_AGENT_PASSWORD, RIDENDINE_SMOKE_OPS_AGENT_PASSWORD | Yes | Yes |

## Probe Matrix

| Status | Role | Method | Route | Expectation | Capability | Last status | Notes |
|---|---|---|---|---|---|---:|---|
| PASS | support_agent | `GET` | `/api/support` | allow | support_queue | 200 | Support can work the support queue. |
| PASS | support_agent | `GET` | `/api/orders` | allow | ops_orders_read | 200 | Support can read order context. |
| PASS | support_agent | `GET` | `/api/engine/exceptions` | allow | exceptions_read | 200 | Support can read exception context. |
| PASS | support_agent | `GET` | `/api/engine/finance` | deny | finance_engine | 403 | Support cannot read finance engine surfaces. |
| PASS | support_agent | `GET` | `/api/team` | deny | team_list | 403 | Support cannot list/manage platform team users. |
| PASS | finance_manager | `GET` | `/api/engine/finance` | allow | finance_engine | 200 | Finance can read finance engine surfaces. |
| PASS | finance_manager | `GET` | `/api/engine/reconciliation` | allow | finance_engine | 200 | Finance can read reconciliation surfaces. |
| PASS | finance_manager | `GET` | `/api/engine/payouts` | allow | finance_payouts | 200 | Finance can read payout surfaces. |
| PASS | finance_manager | `GET` | `/api/orders` | deny | ops_orders_read | 403 | Finance cannot read general ops order queues. |
| PASS | finance_manager | `GET` | `/api/support` | deny | support_queue | 403 | Finance cannot read support queue surfaces. |
| PASS | ops_agent | `GET` | `/api/orders` | allow | ops_orders_read | 200 | Ops agent can read order queues. |
| PASS | ops_agent | `GET` | `/api/engine/dispatch` | allow | dispatch_read | 200 | Ops agent can read dispatch surfaces. |
| PASS | ops_agent | `GET` | `/api/support` | allow | support_queue | 200 | Ops agent can read support queues. |
| PASS | ops_agent | `GET` | `/api/engine/finance` | deny | finance_engine | 403 | Ops agent cannot read finance engine surfaces. |
| PASS | ops_agent | `GET` | `/api/team` | deny | team_list | 403 | Ops agent cannot list/manage platform team users. |

## Failures

None found.
