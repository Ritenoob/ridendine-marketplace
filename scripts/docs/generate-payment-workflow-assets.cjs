const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'docs', 'architecture', 'payment-workflow-assets');

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function box({ id, x, y, w = 220, h = 72, title, subtitle = '', fill = '#ffffff', stroke = '#cbd5e1' }) {
  return `
    <g id="${esc(id)}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <text x="${x + 14}" y="${y + 27}" font-size="15" font-weight="800" fill="#172033">${esc(title)}</text>
      ${subtitle ? `<text x="${x + 14}" y="${y + 50}" font-size="12" fill="#64748b">${esc(subtitle)}</text>` : ''}
    </g>`;
}

function label(text, x, y, fill = '#172033', size = 24) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="900" fill="${fill}">${esc(text)}</text>`;
}

function arrow(x1, y1, x2, y2, color = '#64748b', dashed = false) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="7 7"' : ''} marker-end="url(#arrow)"/>`;
}

function lane(text, x, y, w, h) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <text x="${x + 18}" y="${y + 28}" font-size="14" font-weight="900" fill="#334155">${esc(text)}</text>`;
}

function operationalSvg() {
  const nodes = [
    box({ id: 'customer', x: 60, y: 120, title: 'Customer Checkout', subtitle: 'cart / checkout UI', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'checkout-api', x: 340, y: 120, title: 'POST /api/checkout', subtitle: 'checkout route', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'auth', x: 620, y: 70, title: 'Auth + Validation', subtitle: 'customer, schema, risk' }),
    box({ id: 'cart-menu', x: 620, y: 170, title: 'Cart/Menu Checks', subtitle: 'price + availability' }),
    box({ id: 'idem', x: 900, y: 120, title: 'Checkout Idempotency', subtitle: 'checkout_idempotency_keys', fill: '#eff6ff', stroke: '#93c5fd' }),
    box({ id: 'order', x: 1180, y: 120, title: 'Create Order', subtitle: 'orders + order_items', fill: '#ecfdf5', stroke: '#86efac' }),

    box({ id: 'stripe-pi', x: 60, y: 320, title: 'Stripe PaymentIntent', subtitle: 'order metadata', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'authorize', x: 340, y: 320, title: 'Authorize Payment', subtitle: 'engine.orderCreation' }),
    box({ id: 'client-secret', x: 620, y: 320, title: 'Return Client Secret', subtitle: 'order id + totals', fill: '#ecfdf5', stroke: '#86efac' }),
    box({ id: 'webhook', x: 900, y: 320, title: 'Stripe Webhook', subtitle: 'signature verified', fill: '#fee2e2', stroke: '#fca5a5' }),
    box({ id: 'webhook-idem', x: 1180, y: 320, title: 'Webhook Idempotency', subtitle: 'claim event first', fill: '#eff6ff', stroke: '#93c5fd' }),

    box({ id: 'success', x: 60, y: 520, title: 'Payment Succeeded', subtitle: 'submit to kitchen', fill: '#ecfdf5', stroke: '#86efac' }),
    box({ id: 'failure', x: 340, y: 520, title: 'Payment Failed', subtitle: 'handle failure', fill: '#fee2e2', stroke: '#fca5a5' }),
    box({ id: 'refund', x: 620, y: 520, title: 'Refund Event', subtitle: 'charge.refunded', fill: '#fee2e2', stroke: '#fca5a5' }),
    box({ id: 'finance', x: 900, y: 520, title: 'Finance Handler', subtitle: 'handleStripeFinanceWebhook', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'ledger', x: 1180, y: 520, title: 'Ledger Service', subtitle: 'ledger_entries', fill: '#fff7ed', stroke: '#f0b45f' }),

    box({ id: 'accounts', x: 340, y: 720, title: 'Platform Accounts', subtitle: 'payable balances' }),
    box({ id: 'payout', x: 620, y: 720, title: 'Payout Service', subtitle: 'preview / execute / instant' }),
    box({ id: 'recon', x: 900, y: 720, title: 'Reconciliation', subtitle: 'ops finance visibility', fill: '#eff6ff', stroke: '#93c5fd' }),
  ];

  const arrows = [
    arrow(280, 156, 340, 156),
    arrow(560, 156, 620, 106),
    arrow(560, 156, 620, 206),
    arrow(840, 106, 900, 156),
    arrow(840, 206, 900, 156),
    arrow(1120, 156, 1180, 156),
    arrow(1290, 192, 170, 320),
    arrow(280, 356, 340, 356),
    arrow(560, 356, 620, 356),
    arrow(840, 356, 900, 356, '#64748b', true),
    arrow(1120, 356, 1180, 356),
    arrow(1290, 392, 170, 520),
    arrow(1290, 392, 450, 520),
    arrow(1290, 392, 730, 520),
    arrow(280, 556, 900, 556),
    arrow(560, 556, 900, 556),
    arrow(840, 556, 900, 556),
    arrow(1120, 556, 1180, 556),
    arrow(1290, 592, 450, 720),
    arrow(560, 756, 620, 756),
    arrow(840, 756, 900, 756),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1460" height="860" viewBox="0 0 1460 860">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect width="1460" height="860" fill="#ffffff"/>
  ${label('Ridendine Payment Workflow Schematic', 60, 54)}
  <text x="60" y="82" font-size="14" fill="#64748b">Merchant-of-record checkout, Stripe webhook intake, ledger, payout, and reconciliation flow.</text>
  ${lane('Checkout and Order Creation', 40, 100, 1380, 135)}
  ${lane('Stripe Payment Initialization and Webhook Intake', 40, 300, 1380, 135)}
  ${lane('Payment Outcomes and Finance Processing', 40, 500, 1380, 135)}
  ${lane('Settlement and Reconciliation', 40, 700, 1380, 115)}
  ${arrows.join('\n')}
  ${nodes.join('\n')}
</svg>`;
}

function moneySvg() {
  const nodes = [
    box({ id: 'card', x: 70, y: 160, title: 'Customer Card Payment', subtitle: 'Stripe PaymentIntent', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'merchant', x: 350, y: 160, title: 'Ridendine Merchant Balance', subtitle: 'merchant of record', fill: '#fff7ed', stroke: '#f0b45f' }),
    box({ id: 'capture', x: 650, y: 70, title: 'customer_charge_capture', subtitle: 'total captured' }),
    box({ id: 'tax', x: 650, y: 160, title: 'tax_collected', subtitle: 'tax visibility' }),
    box({ id: 'fee', x: 650, y: 250, title: 'platform_fee', subtitle: 'platform revenue' }),
    box({ id: 'chef', x: 950, y: 70, title: 'chef_payable', subtitle: 'chef/storefront balance', fill: '#ecfdf5', stroke: '#86efac' }),
    box({ id: 'driver', x: 950, y: 160, title: 'driver_payable', subtitle: 'delivery earnings', fill: '#ecfdf5', stroke: '#86efac' }),
    box({ id: 'tip', x: 950, y: 250, title: 'tip_payable', subtitle: 'driver tips', fill: '#ecfdf5', stroke: '#86efac' }),
    box({ id: 'payout-run', x: 1250, y: 115, title: 'Payout Run', subtitle: 'chef / driver / instant' }),
    box({ id: 'payout-debit', x: 1250, y: 220, title: 'Negative Payable Entry', subtitle: 'settlement ledger debit' }),
    box({ id: 'refund', x: 350, y: 380, title: 'Refund Event', subtitle: 'Stripe charge.refunded', fill: '#fee2e2', stroke: '#fca5a5' }),
    box({ id: 'reversal', x: 650, y: 380, title: 'Refund Reversals', subtitle: 'negative payable/platform entries', fill: '#fee2e2', stroke: '#fca5a5' }),
    box({ id: 'recon', x: 950, y: 380, title: 'Reconciliation', subtitle: 'match Stripe, ledger, payouts', fill: '#eff6ff', stroke: '#93c5fd' }),
  ];
  const arrows = [
    arrow(290, 196, 350, 196),
    arrow(570, 196, 650, 106),
    arrow(570, 196, 650, 196),
    arrow(570, 196, 650, 286),
    arrow(870, 106, 950, 106),
    arrow(870, 196, 950, 196),
    arrow(870, 286, 950, 286),
    arrow(1170, 106, 1250, 151),
    arrow(1170, 196, 1250, 151),
    arrow(1170, 286, 1250, 256),
    arrow(570, 416, 650, 416),
    arrow(870, 416, 950, 416),
    arrow(460, 232, 460, 380, '#64748b', true),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1530" height="520" viewBox="0 0 1530 520">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect width="1530" height="520" fill="#ffffff"/>
  ${label('Ridendine Money Movement Schematic', 70, 54)}
  <text x="70" y="82" font-size="14" fill="#64748b">How the customer charge becomes ledger allocations, payables, payout debits, refund reversals, and reconciliation status.</text>
  ${arrows.join('\n')}
  ${nodes.join('\n')}
</svg>`;
}

const mermaid = `flowchart TD
  Customer["Customer Checkout"] --> Checkout["POST /api/checkout"]
  Checkout --> Auth["Customer auth context"]
  Checkout --> Cart["Read cart + cart_items"]
  Checkout --> Menu["Validate menu_items"]
  Checkout --> Quote["Server quote"]
  Checkout --> Risk["Checkout risk check"]
  Checkout --> Idem["checkout_idempotency_keys"]
  Idem --> Order["Create order"]
  Order --> Stripe["Stripe PaymentIntent"]
  Stripe --> Authorize["Authorize payment"]
  Authorize --> Client["Return client secret"]
  Stripe -. async .-> Webhook["Stripe webhook"]
  Webhook --> Signature["Verify signature"]
  Signature --> Claim["Claim webhook event"]
  Claim --> Success{"payment_intent.succeeded?"}
  Success --> Kitchen["Submit to kitchen"]
  Kitchen --> Finance["Finance webhook handler"]
  Claim --> Failure{"payment_intent.payment_failed?"}
  Failure --> PaymentFailure["Handle payment failure"]
  PaymentFailure --> Finance
  Claim --> Refund{"charge.refunded?"}
  Refund --> RefundHandler["Handle external refund"]
  RefundHandler --> Finance
  Finance --> Ledger["ledger_entries"]
  Ledger --> Capture["customer_charge_capture + tax_collected"]
  Ledger --> Payables["chef_payable + driver_payable + platform_fee + tip_payable"]
  Payables --> Accounts["platform_accounts"]
  Accounts --> Payout["payout_runs + payouts"]
  Payout --> Reconciliation["reconciliation"]`;

function drawioFile() {
  const cells = [
    ['customer', 'Customer Checkout', 60, 120],
    ['checkout', 'POST /api/checkout', 310, 120],
    ['order', 'Create Order', 560, 120],
    ['stripe', 'Stripe PaymentIntent', 810, 120],
    ['webhook', 'Stripe Webhook', 1060, 120],
    ['ledger', 'Ledger Entries', 310, 280],
    ['payables', 'Chef / Driver / Platform Payables', 560, 280],
    ['payout', 'Payout Runs', 810, 280],
    ['recon', 'Reconciliation', 1060, 280],
  ];
  const edges = [
    ['e1', 'customer', 'checkout'],
    ['e2', 'checkout', 'order'],
    ['e3', 'order', 'stripe'],
    ['e4', 'stripe', 'webhook'],
    ['e5', 'webhook', 'ledger'],
    ['e6', 'ledger', 'payables'],
    ['e7', 'payables', 'payout'],
    ['e8', 'payout', 'recon'],
  ];
  const cellXml = cells.map(([id, value, x, y]) => `
        <mxCell id="${id}" value="${esc(value)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#d9952f;fontStyle=1" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="190" height="70" as="geometry"/>
        </mxCell>`).join('');
  const edgeXml = edges.map(([id, source, target]) => `
        <mxCell id="${id}" value="" style="endArrow=block;html=1;rounded=0;strokeColor=#64748b;" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`).join('');
  return `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Codex" version="24.7.17" type="device">
  <diagram id="payment-workflow" name="Payment Workflow">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1400" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cellXml}
        ${edgeXml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'payment-workflow-operational.svg'), operationalSvg(), 'utf8');
fs.writeFileSync(path.join(outDir, 'payment-workflow-money-movement.svg'), moneySvg(), 'utf8');
fs.writeFileSync(path.join(outDir, 'payment-workflow.mmd'), mermaid, 'utf8');
fs.writeFileSync(path.join(outDir, 'payment-workflow.drawio'), drawioFile(), 'utf8');

console.log(`Generated usable payment workflow assets in ${outDir}`);
