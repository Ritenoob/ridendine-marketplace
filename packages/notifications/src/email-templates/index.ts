// ==========================================
// EMAIL TEMPLATES
// Per-status rich HTML templates for transactional emails.
// Brand: RideNDine orange/amber (#E85D26) + teal (#1a7a6e).
// ==========================================

// ---- Base layout ----

export function renderEmailHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      ${renderBrand()}
      <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 16px;font-weight:700;">${escapeHtml(title)}</h1>
      ${content}
      ${renderFooter()}
    </div>
  </div>
</body>
</html>`;
}

// ---- Customer: order confirmed / placed ----

export interface OrderConfirmedParams {
  orderNumber: string;
  itemsSummary?: string;
}

export function renderOrderConfirmedEmail(params: OrderConfirmedParams): string {
  const content = `
    <p style="${bodyStyle()}">
      Your order <strong>#${escapeHtml(params.orderNumber)}</strong> has been received and is waiting for the chef to confirm.
    </p>
    ${params.itemsSummary ? renderItemsSummary(params.itemsSummary) : ''}
    <p style="${bodyStyle()}">We'll let you know as soon as the chef accepts your order.</p>
    ${renderStatusBadge('Order Placed', '#E85D26')}
  `;
  return renderEmailHtml('Order Confirmed — RideNDine', content);
}

// ---- Customer: chef accepted ----

export interface ChefAcceptedParams {
  orderNumber: string;
  eta?: string;
  itemsSummary?: string;
}

export function renderChefAcceptedEmail(params: ChefAcceptedParams): string {
  const etaLine = params.eta
    ? `<p style="${bodyStyle()}">Estimated ready time: <strong>${escapeHtml(params.eta)}</strong></p>`
    : '';
  const content = `
    <p style="${bodyStyle()}">
      Great news! The chef has accepted your order <strong>#${escapeHtml(params.orderNumber)}</strong> and is now preparing your meal.
    </p>
    ${etaLine}
    ${params.itemsSummary ? renderItemsSummary(params.itemsSummary) : ''}
    ${renderStatusBadge('Preparing', '#1a7a6e')}
  `;
  return renderEmailHtml('Your Order is Being Prepared — RideNDine', content);
}

// ---- Customer: on the way ----

export interface OnTheWayParams {
  orderNumber: string;
  driverName: string;
  eta?: string;
}

export function renderOnTheWayEmail(params: OnTheWayParams): string {
  const etaLine = params.eta
    ? `<p style="${bodyStyle()}">Estimated delivery: <strong>${escapeHtml(params.eta)}</strong></p>`
    : '';
  const content = `
    <p style="${bodyStyle()}">
      Your order <strong>#${escapeHtml(params.orderNumber)}</strong> has been picked up by
      <strong>${escapeHtml(params.driverName)}</strong> and is on the way to you!
    </p>
    ${etaLine}
    ${renderStatusBadge('On the Way', '#E85D26')}
  `;
  return renderEmailHtml('Your Order is On the Way — RideNDine', content);
}

// ---- Customer: delivered ----

export interface DeliveredParams {
  orderNumber: string;
  itemsSummary?: string;
}

export function renderDeliveredEmail(params: DeliveredParams): string {
  const content = `
    <p style="${bodyStyle()}">
      Your order <strong>#${escapeHtml(params.orderNumber)}</strong> has been delivered. Enjoy your meal!
    </p>
    ${params.itemsSummary ? renderItemsSummary(params.itemsSummary) : ''}
    <p style="${bodyStyle()}">If you enjoyed it, consider leaving a review for your chef.</p>
    ${renderStatusBadge('Delivered', '#1a7a6e')}
  `;
  return renderEmailHtml('Your Order Has Been Delivered — RideNDine', content);
}

// ---- Customer: cancelled ----

export interface OrderCancelledParams {
  orderNumber: string;
  reason?: string;
}

export function renderOrderCancelledEmail(params: OrderCancelledParams): string {
  const reasonLine = params.reason
    ? `<p style="${bodyStyle()}">Reason: ${escapeHtml(params.reason)}</p>`
    : '';
  const content = `
    <p style="${bodyStyle()}">
      Unfortunately, your order <strong>#${escapeHtml(params.orderNumber)}</strong> has been cancelled.
    </p>
    ${reasonLine}
    <p style="${bodyStyle()}">If you were charged, a refund will be processed within 5–10 business days.</p>
    ${renderStatusBadge('Cancelled', '#718096')}
  `;
  return renderEmailHtml('Your Order Was Cancelled — RideNDine', content);
}

// ---- Chef: new order ----

export interface NewOrderParams {
  orderNumber: string;
  customerName: string;
  itemsSummary?: string;
}

export function renderNewOrderEmail(params: NewOrderParams): string {
  const content = `
    <p style="${bodyStyle()}">
      You have a new order <strong>#${escapeHtml(params.orderNumber)}</strong> from <strong>${escapeHtml(params.customerName)}</strong>.
    </p>
    ${params.itemsSummary ? renderItemsSummary(params.itemsSummary) : ''}
    <p style="${bodyStyle()}">
      Please <a href="https://chef.ridendine.ca/dashboard/orders" style="color:#E85D26;font-weight:600;">accept or review</a> the order in your chef dashboard.
    </p>
    ${renderStatusBadge('New Order', '#E85D26')}
  `;
  return renderEmailHtml('New Order Received — RideNDine', content);
}

// ---- Driver: delivery offer ----

export interface DeliveryOfferParams {
  storefrontName: string;
  pickupAddress: string;
  earnings?: string;
}

export function renderDeliveryOfferEmail(params: DeliveryOfferParams): string {
  const earningsLine = params.earnings
    ? `<p style="${bodyStyle()}">Estimated earnings: <strong>${escapeHtml(params.earnings)}</strong></p>`
    : '';
  const content = `
    <p style="${bodyStyle()}">
      A new delivery offer is available from <strong>${escapeHtml(params.storefrontName)}</strong>.
    </p>
    <p style="${bodyStyle()}">
      Pickup address: <strong>${escapeHtml(params.pickupAddress)}</strong>
    </p>
    ${earningsLine}
    <p style="${bodyStyle()}">
      <a href="https://driver.ridendine.ca" style="color:#E85D26;font-weight:600;">Open the driver app</a> to accept this delivery.
    </p>
    ${renderStatusBadge('Delivery Offer', '#E85D26')}
  `;
  return renderEmailHtml('New Delivery Offer — RideNDine', content);
}

// ---- Internal helpers ----

function renderBrand(): string {
  return `
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;letter-spacing:-0.5px;">
        <span style="color:#1a7a6e;">RideN</span><span style="color:#E85D26;">Dine</span>
      </span>
    </div>`;
}

function renderFooter(): string {
  return `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#a0aec0;text-align:center;margin:0;">
      RideNDine — Chef-First Food Delivery &bull; <a href="https://ridendine.ca" style="color:#a0aec0;">ridendine.ca</a>
    </p>`;
}

function renderStatusBadge(label: string, color: string): string {
  return `
    <div style="margin:20px 0 0;">
      <span style="display:inline-block;background:${color};color:#fff;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;">
        ${escapeHtml(label)}
      </span>
    </div>`;
}

function renderItemsSummary(summary: string): string {
  return `
    <div style="background:#f7f8fa;border-radius:8px;padding:12px 16px;margin:12px 0;">
      <p style="font-size:13px;color:#4a5568;margin:0;font-weight:600;">Order Summary</p>
      <p style="font-size:14px;color:#2d3748;margin:4px 0 0;">${escapeHtml(summary)}</p>
    </div>`;
}

function bodyStyle(): string {
  return 'font-size:16px;color:#4a5568;line-height:1.6;margin:0 0 16px;';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
