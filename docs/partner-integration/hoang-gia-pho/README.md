# RideNDine Partner Payment Integration — HOÀNG GIA PHỞ

This kit lets the HOÀNG GIA PHỞ storefront (static site on Vercel) take card
payments where **RideNDine is the merchant of record**. The customer pays on the
partner's own page; the order and PaymentIntent are created in RideNDine under
RideNDine's Stripe account, and RideNDine's Stripe webhook pushes the paid order
to the chef kitchen — exactly the same pipeline as RideNDine's own customers.

## Architecture (why it's secure)

```
 Customer browser (hoang-gia-pho-delivery.html)
        │  1. POST /api/pay { action:'quote'|'checkout', items, customer, address }
        ▼
 Partner Vercel serverless function  /api/pay   ←─ holds RIDENDINE_PARTNER_API_KEY
        │  2. maps item keys → RideNDine menuItemIds, pins storefrontId
        │     POST {RIDENDINE_WEB_BASE}/api/partner/checkout (x-api-key header)
        ▼
 RideNDine  /api/partner/checkout
        │  3. creates guest order + Stripe PaymentIntent → returns clientSecret
        ▼
 Browser mounts Stripe Payment Element with clientSecret, customer pays
        ▼
 Stripe → {RIDENDINE_WEB_BASE}/api/webhooks/stripe → order submitted to kitchen
```

**The API key never reaches the browser.** It lives only in the serverless
function's environment. The browser sends item *keys* (e.g. `beef-pho`), not
UUIDs or prices — the proxy maps them, and RideNDine recomputes all pricing
server-side, so a tampered browser can't change what is charged or order another
storefront's items.

## Files

| File | Goes where | Purpose |
|------|-----------|---------|
| `api/pay.js` | Partner repo root `api/pay.js` | Serverless proxy holding the secret |
| `checkout.html` | Partner site (example page) | Customer form + Stripe Payment Element |
| `.env.example` | Partner repo | Required env vars |

## Setup (partner Vercel project)

1. Copy `api/pay.js` into the partner repo at `api/pay.js` (Vercel auto-deploys
   it as a serverless function at `/api/pay`). Requires Node 18+ (default).
2. In Vercel **Project Settings → Environment Variables**, set:
   - `RIDENDINE_PARTNER_API_KEY` — the shared secret RideNDine issues you
     (same value as RideNDine's `PARTNER_API_KEY`). **Secret — never expose.**
   - `RIDENDINE_WEB_BASE` — RideNDine's deployed URL, e.g.
     `https://app.ridendine.com` (no trailing slash).
3. In `checkout.html`, set `RIDENDINE_STRIPE_PUBLISHABLE_KEY` to RideNDine's
   Stripe **publishable** key (`pk_live_…`). Publishable keys are safe to embed.
4. Deploy.

## This storefront's pinned config (already filled into `api/pay.js`)

- **storefrontId**: `b2b2b2b2-0002-0002-0021-b2b2b2b2b2b2`
- **Menu map** (item key → RideNDine `menuItemId`, canonical price):

  | Key | Dish | menuItemId | Price (CAD) |
  |-----|------|-----------|-------------|
  | `beef-pho` | Beef Pho (Pho Bo) | `b2b2b2b2-0002-0002-0041-b2b2b2b2b2b2` | 32.00 |
  | `chicken-pho` | Chicken Pho (Pho Ga) | `b2b2b2b2-0002-0002-0042-b2b2b2b2b2b2` | 30.00 |
  | `bun-bo-hue` | Bun Bo Hue | `b2b2b2b2-0002-0002-0043-b2b2b2b2b2b2` | 34.00 |
  | `bun-thit-xao` | Bun Thit Xao | `b2b2b2b2-0002-0002-0044-b2b2b2b2b2b2` | 28.00 |
  | `bo-kho` | Bo Kho | `b2b2b2b2-0002-0002-0045-b2b2b2b2b2b2` | 36.00 |

  Tag each menu item in the storefront UI with its key (e.g.
  `data-ridendine-key="beef-pho"`) so the cart can send keys + quantities.

## Important: show RideNDine's total, not your own

The current page shows a flat `Delivery fee $7.99` + `HST 13%`. **Ignore that for
payment.** RideNDine computes the authoritative delivery fee, service fee, tax,
and total. Always call `action:'quote'` first and render *that* breakdown before
collecting payment, so the displayed total matches what is charged.

## Request / response contract (`/api/pay`)

**Quote** — `POST /api/pay`
```json
{
  "action": "quote",
  "items": [{ "key": "beef-pho", "quantity": 2, "specialInstructions": "no onion" }],
  "customer": { "email": "x@y.com", "firstName": "An", "lastName": "Nguyen", "phone": "+12896982958" },
  "deliveryAddress": { "addressLine1": "12 Main St W", "city": "Hamilton", "state": "ON", "postalCode": "L8P1A1" },
  "tip": 3
}
```
Returns `{ currency, breakdown: { subtotal, deliveryFee, serviceFee, tax, tip, discount, total, … } }`.

**Checkout** — `POST /api/pay`
```json
{ "action": "checkout", "idempotencyKey": "<your-order-id>", "items": [...], "customer": {...}, "deliveryAddress": {...}, "tip": 3 }
```
Returns `{ clientSecret, orderId, orderNumber, total, breakdown }`. Confirm
`clientSecret` with Stripe.js. **Reuse the same `idempotencyKey` on retries** of
the same order so a network retry never double-charges.

## Testing

Use Stripe test mode (RideNDine pointed at `sk_test_…` / `pk_test_…`) and card
`4242 4242 4242 4242`, any future expiry/CVC. Confirm the order appears in the
chef app after `payment_intent.succeeded`.
