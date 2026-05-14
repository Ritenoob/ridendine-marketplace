# Test-User Walkthrough — RideNDine Closed Beta

**Last updated:** 2026-05-14

This is the script to give to a friend, family member, or first beta tester so they can run through the whole RideNDine app end-to-end without any help.

---

## What they need before starting

- A web browser (the customer site and chef site work on phone & desktop; the driver site is mobile-friendly)
- An email they can check (signup confirmation may land there)
- **Test card:** `4242 4242 4242 4242` — any future expiry, any CVC. **No real money is charged.**

---

## Path 1 — As a Customer (5 minutes)

**Goal:** Order a meal from a real Hamilton chef, watch it move through statuses.

1. Open **https://ridendine.ca** in a browser.
   - You should see an amber banner across the top reminding you this is a closed beta + the test card number.
2. Click **Browse Chefs** (or the **/chefs** link).
   - You should see exactly **3 chefs**: Every Bite Yum (Sean), HOANG GIA PHO (Tuan), COOCO (Ryo).
3. Click any chef. Each has a real menu with prices and descriptions.
   - **Every Bite Yum** — Hamilton smash burgers + comfort food (Classic Smash, Nashville Hot, Mushroom Swiss, BBQ Bacon, Tenders)
   - **HOANG GIA PHO** — Vietnamese pho + bun (Pho Bo, Pho Ga, Bun Bo Hue, Bun Thit Xao, Bo Kho)
   - **COOCO** — Japanese ramen + don (Tonkotsu, Shoyu, Katsu Curry, Gyudon, Karaage Don)
4. **Add to cart**. You'll be asked to sign in or sign up if you haven't already.
   - Signup: name, email, password 8+ chars. Tick the T&C box (it says you're 18+ and food is prepared by independent chefs).
5. Open the cart and click **Checkout**.
6. Enter a Hamilton delivery address (e.g. **123 King St E, Hamilton, ON L8N 1A8**).
7. Choose **Card** payment. Enter:
   - Card: `4242 4242 4242 4242`
   - Expiry: any future month/year (e.g. `12/30`)
   - CVC: any 3 digits (e.g. `123`)
   - Postal: any (`L8N 1A8`)
8. Click **Place Order**.
9. You'll be redirected to the order tracking page. The order starts in **Pending** → moves to **Preparing** once the chef accepts → **On the way** → **Delivered**.

**What to watch for:**
- Page transitions are smooth, no spinners that hang
- Order number is visible (format `RD-XXXXXXXX-XXXX`)
- The estimated delivery time shows
- After "Delivered", a "Leave a Review" button appears

---

## Path 2 — As a Chef (5 minutes)

**Goal:** Sign up as a new chef, build a fake storefront, see how the chef dashboard works.

> ⚠️ **Don't use this with the 3 real chefs' identities.** Make up a name. Real chefs have already been onboarded.

1. Open **https://chef.ridendine.ca/auth/signup**.
2. Fill in: First name, last name, email, phone (any format), password 8+ chars.
3. Tick **both** acknowledgement boxes:
   - T&C and Privacy
   - Independent contractor + food safety + tax + allergens
4. Click **Create chef account**.
5. You'll be auto-approved and dropped straight on **/dashboard/storefront**.
6. Set up the storefront:
   - **Name** — e.g. "My Test Kitchen"
   - **Description** — anything
   - **Cuisine types** — pick any
   - **Address** — any Hamilton address
   - **Prep times** — defaults are fine
7. Save. Storefront is `is_active=false` by default — customers can't see it yet.
8. Navigate to **Menu** → **Add menu item**. Add 1 item with name, price (in dollars), description.
9. Navigate to **Availability** → set at least one day open.
10. Navigate to **Payouts** → click **Set up payouts** → completes Stripe Connect Express in test mode (use Stripe's test SIN `000-000-000` and routing/account from https://docs.stripe.com/connect/testing).

**What to watch for:**
- Sidebar shows: Storefront, Menu, Orders, Availability, Payouts, Profile, Settings
- The "Storefront Readiness" checklist on the dashboard ticks green as you complete each step
- The "Ops approval" line is already green (auto-approved on signup)
- Top-right shows your initials + sign-out

**Optional:** Activate your storefront and have someone place an order from `ridendine.ca` to see your dashboard receive it in real time.

---

## Path 3 — As a Driver (5 minutes)

**Goal:** Sign up as a new driver, see the dashboard + how offers would appear.

> ⚠️ The only real driver right now is **Sean** (Sean's account at the Ridendine email). When you test, sign up with a different email so you don't conflict with Sean's account.

1. Open **https://driver.ridendine.ca/auth/signup**.
2. Fill in: First name, last name, email, phone, vehicle type (Car / Motorcycle / Bicycle / Scooter), password 8+ chars.
3. Tick **both** acknowledgement boxes:
   - T&C and Privacy
   - Independent contractor + valid licence + commercial-delivery insurance + no-phone-while-driving + tax
4. Click **Submit Application**.
5. You'll be auto-approved and dropped on the driver dashboard (the home page).
6. Toggle yourself **Online**.
7. If an order is currently waiting for a driver, you'll see an **Offer** card with pickup + dropoff + estimated earnings + accept/decline. The current demo order `RD-DEMO-001` is already in `picked_up` state so you won't see that one — place a fresh order from the customer flow if you want to see an offer in real time.
8. Once you accept, the bottom-of-screen tabs swap to "Active delivery" with navigation, arrival confirmation, proof-of-delivery photo capture.

**What to watch for:**
- After signup, you're NOT shown a "your application is being reviewed" screen — you're in the app immediately
- The driver dashboard is mobile-first (designed for phones)
- Going online → driver_presence row in DB is updated

---

## Path 4 — Ops dashboard (Sean only)

**URL:** **https://ops.ridendine.ca/auth/login**

The ops dashboard is for monitoring + intervening. Use the existing super-admin account.

What you can do from here:
- Live board — every active order, every active delivery
- Chefs — approve/suspend
- Drivers — approve/suspend, view documents, view payouts
- Finance — payouts, refunds, ledger
- Engine processors — see SLA tick, dispatch attempts, payout-batch cron status
- System alerts — dispatch low-supply warnings, escalated exceptions

---

## Known limitations during the closed beta

- **Test mode only.** All Stripe payments are test mode. The flag `STRIPE_ALLOW_TEST_IN_PRODUCTION=true` is set in Vercel; remove before public launch.
- **No SMS confirmation.** Twilio is configured but only fires for status changes, not signup OTP.
- **Limited drivers.** Sean is the only real driver. If you place a real order while Sean isn't online, the dispatch will fail and ops sees a low-supply warning.
- **Email confirmations.** Supabase email confirmation may be off — new signups land directly in the app with a session.
- **Privacy & Terms are DRAFT.** Banners at the top of /privacy and /terms pages make this clear. Counsel review pending.

---

## If something breaks

- Order stuck in "Pending" for more than 8 minutes → ops sees an SLA breach, the engine auto-rejects (this is intentional safety to release customer funds)
- Chef dashboard says "Set up your storefront" but you just made one → reload, the empty-state check is cached on the server for ~30s
- Driver dashboard says "Awaiting approval" → bug, file an issue; auto-approval is now the default for fresh signups
- Customer sees no chefs on `/chefs` → check you're not signed out + the chef has both `status='approved'` and storefront `is_active=true`

## Quick smoke-test commands for during a test session

```bash
# Is the customer marketplace showing exactly 3 chefs?
curl -s https://ridendine.ca/chefs | grep -oE '(Every Bite Yum|HOANG GIA PHO|COOCO|Mirko B Test Kitchen)' | sort -u
# Should print exactly: COOCO, Every Bite Yum, HOANG GIA PHO

# Are all 4 apps healthy?
for u in https://ridendine.ca https://chef.ridendine.ca https://ops.ridendine.ca https://driver.ridendine.ca; do
  printf "%-35s " "$u"
  curl -s -o /dev/null -w 'HTTP %{http_code}\n' "$u/api/health"
done
```

---

## What's tested today

| Path | Tested | Last verified |
|---|---|---|
| Customer signup → browse → cart → checkout (test card) | ✅ | 2026-05-14 — real order `RD-MP4ZNSEA-AJKX` reached `payment_authorized` |
| Customer order tracking (status updates) | ✅ | Demo order `RD-DEMO-001` in `picked_up` |
| Chef signup → dashboard (auto-approved) | 🆕 just shipped | After PR #23 merges |
| Chef Stripe Connect onboarding | ⚠️ Wired but not exercised E2E | Real chef walkthrough pending |
| Driver signup → dashboard (auto-approved) | 🆕 just shipped | After PR #23 merges |
| Driver online → offer → accept → deliver | ⚠️ Wired but needs Sean online + a fresh order | |
| Refund flow (with platform-fee reversal) | ⚠️ Wired (D.3) but not E2E tested | |
