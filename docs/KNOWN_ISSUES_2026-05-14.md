# Known Issues — Post-PR-#23 — 2026-05-14

Found during the post-merge verification pass. None of these are showstoppers for a closed-beta test user, but they need fixing before real-money launch.

## Resolution log

- **2026-05-18 — Issue #1 code side complete.** As Task 2 of `docs/plans/2026-05-18-production-readiness-stabilization.md`:
  - `GET /api/engine/health` now returns `readiness.processorRuns.{sla,expired-offers,...}.lastSuccessAt` from the `ops_processor_runs` table, so uptime monitors can alert on stale processors rather than just missing env vars (`apps/ops-admin/src/app/api/engine/health/route.ts`).
  - Legacy duplicate `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` is marked deprecated in its header; the canonical SLA cron is `POST /api/engine/processors/sla` (which is what `apps/ops-admin/vercel.json` already points at).
  - `scripts/local-cron.mjs` now invokes the canonical `/api/engine/processors/*` routes during local dev, matching production.
  - Operator action still required: push `CRON_SECRET` and `ENGINE_PROCESSOR_TOKEN` to the `ridendine-ops-admin` Vercel project so the 401s actually clear. The code side cannot do this; see the "Fix (Sean to apply)" section below.

---

## ⚠️ #1 — Vercel cron jobs are silently 401-ing on ops-admin

**Symptom:** Every cron in `apps/ops-admin/vercel.json` returns 401 when called:
```
$ curl -X POST https://ops.ridendine.ca/api/engine/processors/sla
{"success":false,"error":"Unauthorized"}
```

This affects:
- `* * * * *` SLA tick processor (chef-acceptance timeout, driver-assignment timeout, stale preparing orders)
- `* * * * *` expired-offers cleanup
- `0 6 * * *` driver payout preview
- `0 7 * * 1` chef payout preview (weekly)
- `30 5 * * *` daily reconciliation

**Evidence cron has never fired in production:**
- `system_alerts` table: **0 rows total** (SLA processor logs warnings here)
- `chef_payouts` table: **empty** (weekly payout cron would populate)
- `RD-MP4ZNSEA-AJKX` order has sat in `payment_authorized` for 12+ hours with no auto-rejection (5-min chef-accept SLA should have fired)

**Root cause:** The endpoint requires either:
- `Authorization: Bearer <CRON_SECRET>` (Vercel's auto-injected header when project env has `CRON_SECRET`)
- `x-processor-token: <ENGINE_PROCESSOR_TOKEN>` (custom fallback)

Both return 401, which means `process.env.CRON_SECRET` and `process.env.ENGINE_PROCESSOR_TOKEN` are **not set** on the ops-admin Vercel project, OR are set to values different from `.env.local`. With both empty, `validateEngineProcessorHeaders` fails closed (see [packages/utils/src/processor-auth.ts:11](packages/utils/src/processor-auth.ts:11)).

**Fix (Sean to apply):**

The `.env.local` file already has known-good values. Set them on Vercel for project `ridendine-ops-admin` (id `prj_RgQF9FvEBdpW4v8px65TaPLJQnsY`):

Either via Vercel UI:
1. https://vercel.com/stm-tech/ridendine-ops-admin/settings/environment-variables
2. Add `CRON_SECRET` = (value from `.env.local`), scope: Production + Preview + Development
3. Add `ENGINE_PROCESSOR_TOKEN` = (value from `.env.local`), same scopes
4. Trigger a redeploy

Or via Vercel CLI:
```bash
vercel env add CRON_SECRET production --token <vercel-token>
# paste value
vercel env add ENGINE_PROCESSOR_TOKEN production --token <vercel-token>
# paste value
vercel --prod
```

Or via REST API:
```bash
curl -X POST "https://api.vercel.com/v10/projects/prj_RgQF9FvEBdpW4v8px65TaPLJQnsY/env?teamId=team_gMKA4oRiCJg3G1agfMcGhTM1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"CRON_SECRET","value":"<from .env.local>","type":"encrypted","target":["production","preview","development"]}'
```

**Verify after fix:**
```bash
CRON_SECRET=$(grep CRON_SECRET= .env.local | cut -d= -f2)
curl -X POST "https://ops.ridendine.ca/api/engine/processors/sla" \
  -H "Authorization: Bearer $CRON_SECRET"
# Should return 200 with engine processor run details, not 401
```

---

## ⚠️ #2 — RD-MP4ZNSEA-AJKX stuck order (real Stripe auth from today)

**Order:** `dd162200-b218-464c-955d-965734fae1b2` placed by customer `7b0c7cfc-…` at storefront `a1a1a1a1-…` (Every Bite Yum).

**State:**
- `engine_status`: `payment_authorized` (Stripe holds the funds, not captured)
- `created_at`: 2026-05-14T04:28:49Z
- No chef acceptance, no auto-rejection, no exception
- 3 sibling draft orders from the same customer (`RD-MP4ZIIVO-O7H6`, `RD-MP4ZFDY5-ZGK6`, `RD-MP4XN5M7-QXTZ`) — abandoned carts

**Customer-facing impact:** Test card (`4242…`) auth holds release after 7 days automatically. No real funds at risk. But the order shows in their order history as "pending forever" which is confusing.

**Fix:** Once cron is unblocked (#1 above), the SLA tick will catch this on its next run and call `engine.platform.cancelOrder` with reason `sla_breach`. Alternatively, ops can manually reject from `/dashboard/orders` in ops-admin.

**Mitigation for testers now:** When a test user places a fresh order, you'll need to manually accept it from chef-admin (sign in as Sean / Tuan / Ryo depending on which storefront they ordered from). The SLA auto-reject won't fire until #1 is fixed.

---

## ⚠️ #3 — Driver presence is stale

**Symptom:** `driver_presence` shows Sean and Mike as `status='online'` but `last_location_at IS NULL` and `updated_at` is from April 21 / May 14 00:57 — neither has actually been on the driver-app recently.

**Impact:** Fresh customer orders will fail dispatch (or rather succeed-with-warning per the D.4 commit) because no driver is actively reporting GPS in the matching radius. A 5km Haversine search will return zero eligible drivers.

**Fix for test order to dispatch:** Sean opens `https://driver.ridendine.ca` on his phone, signs in, toggles online. That sends a position to `driver_presence` and the next dispatch attempt will find him.

---

## Test users can still walk the customer flow — they just won't see chef → driver progression

Until #1 and #3 are fixed, a test user placing an order will see:
1. ✅ Signup, browse, cart, checkout with `4242…` test card — works
2. ✅ Order placed, `engine_status='payment_authorized'`, payment intent succeeded — works
3. ❌ Order shows "Pending" forever — chef has to manually accept
4. ❌ Once chef accepts, status moves to `accepted` → `preparing` → `ready_for_pickup` — works (no cron needed)
5. ❌ Driver dispatch will fail with no eligible drivers — Sean needs to be online

**For a clean test walkthrough today, before the cron fix:**
- Sean has both phones open: one on chef-admin (as Sean / Every Bite Yum), one on driver-app (as Sean's driver account)
- Tester places an order on ridendine.ca pointing at Every Bite Yum
- Sean watches chef-admin → clicks Accept → Prepare → Ready
- Sean's driver-app should receive the offer (manual dispatch can be triggered from ops if not)
- Sean drives the test miles + marks delivered

---

## Lower-priority cleanup

- 3 abandoned draft orders from `7b0c7cfc-…` — can be deleted directly via REST if cluttering the customer's order history
- 4 driver records that aren't real people (Marcus + Priya are seed UUIDs with `user_id=null`, Mike + Sarah have user_ids but no clear owner) — can be set to `status='suspended'` if you want only Sean to receive offers
- Mirko's storefront content still says "Test Dummy" — Mirko needs to log into chef.ridendine.ca and edit (or you do it on his behalf)
