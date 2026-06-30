// ==========================================
// HOÀNG GIA PHỞ → RideNDine payment proxy (Vercel serverless function)
// Deploy at:  api/pay.js   →   https://<partner-domain>/api/pay
//
// Holds the RideNDine partner secret server-side so it never reaches the
// browser. Pins this storefront's id + menu map server-side so the browser can
// only order THIS storefront's items, by key — never arbitrary UUIDs or prices.
//
// Required env vars (Vercel → Project Settings → Environment Variables):
//   RIDENDINE_PARTNER_API_KEY   the shared secret RideNDine issued you (secret!)
//   RIDENDINE_WEB_BASE          e.g. https://app.ridendine.com  (no trailing /)
// ==========================================

const STOREFRONT_ID = 'b2b2b2b2-0002-0002-0021-b2b2b2b2b2b2';

// Item key (what the browser sends) → RideNDine menuItemId.
// Prices are recomputed by RideNDine; listed here only for reference.
const MENU = {
  'beef-pho':     'b2b2b2b2-0002-0002-0041-b2b2b2b2b2b2', // Beef Pho (Pho Bo)   $32
  'chicken-pho':  'b2b2b2b2-0002-0002-0042-b2b2b2b2b2b2', // Chicken Pho (Pho Ga) $30
  'bun-bo-hue':   'b2b2b2b2-0002-0002-0043-b2b2b2b2b2b2', // Bun Bo Hue          $34
  'bun-thit-xao': 'b2b2b2b2-0002-0002-0044-b2b2b2b2b2b2', // Bun Thit Xao        $28
  'bo-kho':       'b2b2b2b2-0002-0002-0045-b2b2b2b2b2b2', // Bo Kho              $36
};

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json');
  res.send(JSON.stringify(body));
}

/** Build the RideNDine partner payload from the (untrusted) browser body. */
function buildOrder(body) {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw { status: 400, code: 'NO_ITEMS', message: 'Cart is empty' };
  }

  const items = body.items.map((line) => {
    const menuItemId = MENU[line.key];
    if (!menuItemId) {
      throw { status: 400, code: 'UNKNOWN_ITEM', message: `Unknown item: ${line.key}` };
    }
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw { status: 400, code: 'BAD_QUANTITY', message: `Bad quantity for ${line.key}` };
    }
    return {
      menuItemId,
      quantity,
      specialInstructions: line.specialInstructions
        ? String(line.specialInstructions).slice(0, 500)
        : undefined,
    };
  });

  const c = body.customer || {};
  if (!c.email || !c.firstName) {
    throw { status: 400, code: 'MISSING_CUSTOMER', message: 'customer.email and customer.firstName are required' };
  }
  const a = body.deliveryAddress || {};
  if (!a.addressLine1 || !a.city || !a.state || !a.postalCode) {
    throw { status: 400, code: 'MISSING_ADDRESS', message: 'deliveryAddress requires addressLine1, city, state, postalCode' };
  }

  return {
    storefrontId: STOREFRONT_ID,
    customer: {
      email: String(c.email),
      firstName: String(c.firstName),
      lastName: c.lastName ? String(c.lastName) : '',
      phone: c.phone ? String(c.phone).slice(0, 20) : undefined,
    },
    deliveryAddress: {
      label: 'Delivery',
      addressLine1: String(a.addressLine1),
      addressLine2: a.addressLine2 ? String(a.addressLine2) : undefined,
      city: String(a.city),
      state: String(a.state),
      postalCode: String(a.postalCode),
      country: a.country ? String(a.country) : 'CA',
      deliveryInstructions: a.deliveryInstructions ? String(a.deliveryInstructions) : undefined,
    },
    tip: Number(body.tip) || 0,
    specialInstructions: body.specialInstructions ? String(body.specialInstructions).slice(0, 1000) : undefined,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { code: 'METHOD_NOT_ALLOWED', error: 'Use POST' });
  }

  const apiKey = process.env.RIDENDINE_PARTNER_API_KEY;
  const webBase = process.env.RIDENDINE_WEB_BASE;
  if (!apiKey || !webBase) {
    return json(res, 500, { code: 'CONFIG', error: 'Payment integration not configured' });
  }

  // Vercel parses JSON bodies automatically; fall back to manual parse.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { code: 'BAD_JSON', error: 'Invalid JSON' }); }
  }
  body = body || {};

  const action = body.action === 'quote' ? 'quote' : 'checkout';

  let order;
  try {
    order = buildOrder(body);
  } catch (e) {
    return json(res, e.status || 400, { code: e.code || 'VALIDATION_ERROR', error: e.message || 'Invalid order' });
  }

  const path = action === 'quote' ? '/api/partner/checkout/quote' : '/api/partner/checkout';
  const headers = { 'content-type': 'application/json', 'x-api-key': apiKey };

  // For checkout, forward the caller's order id as the Stripe-safe idempotency
  // key so a retry of the same order never creates a second charge.
  if (action === 'checkout') {
    const idem = body.idempotencyKey ? String(body.idempotencyKey).slice(0, 128) : '';
    if (!idem) {
      return json(res, 400, { code: 'MISSING_IDEMPOTENCY', error: 'idempotencyKey is required for checkout' });
    }
    headers['Idempotency-Key'] = idem;
  }

  try {
    const upstream = await fetch(`${webBase}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });
    const text = await upstream.text();
    // Pass RideNDine's status + body straight through (already-safe JSON shape).
    res.status(upstream.status).setHeader('content-type', 'application/json');
    return res.send(text);
  } catch (err) {
    console.error('RideNDine proxy error:', err);
    return json(res, 502, { code: 'UPSTREAM_ERROR', error: 'Payment service unavailable' });
  }
};
