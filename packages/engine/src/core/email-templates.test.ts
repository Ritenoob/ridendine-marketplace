// ==========================================
// EMAIL TEMPLATES TESTS
// TDD: Per-status rich HTML email templates
// ==========================================

import { describe, it, expect } from 'vitest';
import {
  renderOrderConfirmedEmail,
  renderChefAcceptedEmail,
  renderOnTheWayEmail,
  renderDeliveredEmail,
  renderOrderCancelledEmail,
  renderNewOrderEmail,
  renderDeliveryOfferEmail,
  renderEmailHtml,
} from '@ridendine/notifications/email-templates';

describe('Email Templates', () => {
  describe('renderEmailHtml (base layout)', () => {
    it('includes RideNDine brand in output', () => {
      const html = renderEmailHtml('Test Title', '<p>Test</p>');
      expect(html).toContain('RideN');
      expect(html).toContain('Dine');
    });

    it('includes the title in output', () => {
      const html = renderEmailHtml('My Title', '<p>body</p>');
      expect(html).toContain('My Title');
    });

    it('includes the content in output', () => {
      const html = renderEmailHtml('Title', '<p>Special content here</p>');
      expect(html).toContain('Special content here');
    });

    it('is valid HTML with DOCTYPE', () => {
      const html = renderEmailHtml('T', '<p>B</p>');
      expect(html).toMatch(/<!DOCTYPE html>/i);
    });

    it('uses orange/amber brand colors', () => {
      const html = renderEmailHtml('T', '<p>B</p>');
      expect(html).toMatch(/#[Ee]85[Dd]26|#[Ff][57][0-9a-fA-F]{4}|orange|amber/i);
    });
  });

  describe('renderOrderConfirmedEmail', () => {
    it('includes order number', () => {
      const html = renderOrderConfirmedEmail({ orderNumber: 'RD-1001' });
      expect(html).toContain('RD-1001');
    });

    it('includes confirmation status message', () => {
      const html = renderOrderConfirmedEmail({ orderNumber: 'RD-1001' });
      expect(html.toLowerCase()).toMatch(/confirm|placed|received/);
    });
  });

  describe('renderChefAcceptedEmail', () => {
    it('includes order number', () => {
      const html = renderChefAcceptedEmail({ orderNumber: 'RD-1002' });
      expect(html).toContain('RD-1002');
    });

    it('mentions preparation or accepted', () => {
      const html = renderChefAcceptedEmail({ orderNumber: 'RD-1002' });
      expect(html.toLowerCase()).toMatch(/accept|prepar/);
    });

    it('includes optional ETA when provided', () => {
      const html = renderChefAcceptedEmail({ orderNumber: 'RD-1002', eta: '30 minutes' });
      expect(html).toContain('30 minutes');
    });

    it('does not break when ETA is omitted', () => {
      expect(() => renderChefAcceptedEmail({ orderNumber: 'RD-1002' })).not.toThrow();
    });
  });

  describe('renderOnTheWayEmail', () => {
    it('includes order number', () => {
      const html = renderOnTheWayEmail({ orderNumber: 'RD-1003', driverName: 'Bob' });
      expect(html).toContain('RD-1003');
    });

    it('includes driver name when provided', () => {
      const html = renderOnTheWayEmail({ orderNumber: 'RD-1003', driverName: 'Bob' });
      expect(html).toContain('Bob');
    });

    it('mentions delivery in progress', () => {
      const html = renderOnTheWayEmail({ orderNumber: 'RD-1003', driverName: 'Alice' });
      expect(html.toLowerCase()).toMatch(/way|deliver|pickup|picked/);
    });
  });

  describe('renderDeliveredEmail', () => {
    it('includes order number', () => {
      const html = renderDeliveredEmail({ orderNumber: 'RD-1004' });
      expect(html).toContain('RD-1004');
    });

    it('mentions delivery completion', () => {
      const html = renderDeliveredEmail({ orderNumber: 'RD-1004' });
      expect(html.toLowerCase()).toMatch(/deliver|enjoy|meal/);
    });
  });

  describe('renderOrderCancelledEmail', () => {
    it('includes order number', () => {
      const html = renderOrderCancelledEmail({ orderNumber: 'RD-1005' });
      expect(html).toContain('RD-1005');
    });

    it('includes cancellation reason when provided', () => {
      const html = renderOrderCancelledEmail({ orderNumber: 'RD-1005', reason: 'Chef unavailable' });
      expect(html).toContain('Chef unavailable');
    });

    it('does not break when reason is omitted', () => {
      expect(() => renderOrderCancelledEmail({ orderNumber: 'RD-1005' })).not.toThrow();
    });
  });

  describe('renderNewOrderEmail (chef notification)', () => {
    it('includes order number', () => {
      const html = renderNewOrderEmail({ orderNumber: 'RD-1006', customerName: 'Alice' });
      expect(html).toContain('RD-1006');
    });

    it('includes customer name', () => {
      const html = renderNewOrderEmail({ orderNumber: 'RD-1006', customerName: 'Alice' });
      expect(html).toContain('Alice');
    });

    it('mentions new order or action needed', () => {
      const html = renderNewOrderEmail({ orderNumber: 'RD-1006', customerName: 'Alice' });
      expect(html.toLowerCase()).toMatch(/new order|accept|review/);
    });
  });

  describe('renderDeliveryOfferEmail (driver notification)', () => {
    it('mentions delivery offer', () => {
      const html = renderDeliveryOfferEmail({ storefrontName: 'Chef Alice Kitchen', pickupAddress: '123 Main St' });
      expect(html.toLowerCase()).toMatch(/delivery|offer/);
    });

    it('includes storefront name', () => {
      const html = renderDeliveryOfferEmail({ storefrontName: 'Chef Alice Kitchen', pickupAddress: '123 Main St' });
      expect(html).toContain('Chef Alice Kitchen');
    });

    it('includes pickup address', () => {
      const html = renderDeliveryOfferEmail({ storefrontName: 'Chef Alice Kitchen', pickupAddress: '123 Main St' });
      expect(html).toContain('123 Main St');
    });
  });
});
