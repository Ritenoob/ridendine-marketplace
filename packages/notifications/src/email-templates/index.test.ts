// ==========================================
// Email template smoke tests
// Focus: HTML escaping of user-controlled values and basic structure.
// (Engine-level template selection tests live in
// packages/engine/src/core/email-templates.test.ts.)
// ==========================================

import { describe, expect, it } from 'vitest';
import {
  renderEmailHtml,
  renderOrderConfirmedEmail,
  renderChefAcceptedEmail,
  renderOnTheWayEmail,
  renderNewOrderEmail,
  renderOrderCancelledEmail,
} from './index';

describe('renderEmailHtml', () => {
  it('produces a full HTML document with the escaped title', () => {
    const html = renderEmailHtml('Hello <World> & "Friends"', '<p>body</p>');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Hello &lt;World&gt; &amp; &quot;Friends&quot;');
    expect(html).not.toContain('<World>');
    // Content is trusted (built by template functions) and passed through
    expect(html).toContain('<p>body</p>');
  });
});

describe('HTML escaping of user-controlled params', () => {
  it('escapes script injection in the order number', () => {
    const html = renderOrderConfirmedEmail({
      orderNumber: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes the customer name in chef new-order emails', () => {
    const html = renderNewOrderEmail({
      orderNumber: 'RD-1001',
      customerName: `"><img src=x onerror=alert('xss')>`,
    });
    expect(html).not.toContain(`<img src=x onerror=alert('xss')>`);
    expect(html).toContain('&quot;&gt;&lt;img');
  });

  it('escapes the driver name and items summary', () => {
    const onTheWay = renderOnTheWayEmail({
      orderNumber: 'RD-1002',
      driverName: "O'Brien & Sons <fast>",
    });
    expect(onTheWay).toContain('O&#039;Brien &amp; Sons &lt;fast&gt;');

    const confirmed = renderOrderConfirmedEmail({
      orderNumber: 'RD-1003',
      itemsSummary: '2 x Jerk Chicken <b>extra spicy</b>',
    });
    expect(confirmed).toContain('2 x Jerk Chicken &lt;b&gt;extra spicy&lt;/b&gt;');
  });

  it('escapes cancellation reasons', () => {
    const html = renderOrderCancelledEmail({
      orderNumber: 'RD-1004',
      reason: '<iframe src="evil"></iframe>',
    });
    expect(html).not.toContain('<iframe');
    expect(html).toContain('&lt;iframe');
  });
});

describe('template structure', () => {
  it('order confirmed email contains brand, order number, and status badge', () => {
    const html = renderOrderConfirmedEmail({ orderNumber: 'RD-2001' });
    expect(html).toContain('RD-2001');
    expect(html).toContain('RideN');
    expect(html).toContain('Order Placed');
  });

  it('chef accepted email includes the ETA when provided and omits it otherwise', () => {
    const withEta = renderChefAcceptedEmail({ orderNumber: 'RD-2002', eta: '6:30 PM' });
    expect(withEta).toContain('6:30 PM');
    const withoutEta = renderChefAcceptedEmail({ orderNumber: 'RD-2002' });
    expect(withoutEta).not.toContain('Estimated ready time');
  });
});
