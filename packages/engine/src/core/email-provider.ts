// ==========================================
// RESEND EMAIL DELIVERY PROVIDER
// Sends transactional emails when RESEND_API_KEY is configured.
// Falls back gracefully when not configured — DB notifications still work.
// Uses per-status rich HTML templates from @ridendine/notifications/email-templates.
// ==========================================

import type { NotificationType } from '@ridendine/types';
import type { NotificationDeliveryProvider } from './notification-sender';
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

// Email subjects keyed by notification type
const EMAIL_SUBJECTS: Partial<Record<NotificationType, string>> = {
  order_placed: 'New Order Received',
  order_accepted: 'Your Order Has Been Accepted',
  order_rejected: 'Order Update',
  order_ready: 'Your Order is Ready for Pickup',
  order_picked_up: 'Your Order is On Its Way',
  order_delivered: 'Your Order Has Been Delivered!',
  order_cancelled: 'Your Order Was Cancelled',
  refund_processed: 'Your Refund Has Been Processed',
  delivery_offer: 'New Delivery Available',
  chef_approved: 'Welcome to RideNDine!',
  driver_approved: 'Welcome to RideNDine!',
  review_received: 'You Received a New Review',
};

function buildRichHtml(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): string {
  const orderNumber = String(data?.['orderNumber'] ?? data?.['order_number'] ?? '');
  const customerName = String(data?.['customerName'] ?? '');
  const driverName = String(data?.['driverName'] ?? '');
  const reason = String(data?.['reason'] ?? '');
  const eta = data?.['eta'] ? String(data['eta']) : undefined;
  const storefrontName = String(data?.['storefrontName'] ?? '');
  const pickupAddress = String(data?.['pickupAddress'] ?? '');
  const earnings = data?.['earnings'] ? String(data['earnings']) : undefined;

  switch (type) {
    case 'order_placed':
      return customerName
        ? renderNewOrderEmail({ orderNumber, customerName })
        : renderOrderConfirmedEmail({ orderNumber });
    case 'order_accepted':
      return renderChefAcceptedEmail({ orderNumber, eta });
    case 'order_picked_up':
      return renderOnTheWayEmail({ orderNumber, driverName, eta });
    case 'order_delivered':
      return renderDeliveredEmail({ orderNumber });
    case 'order_cancelled':
      return renderOrderCancelledEmail({ orderNumber, reason: reason || undefined });
    case 'delivery_offer':
      return renderDeliveryOfferEmail({ storefrontName, pickupAddress, earnings });
    default:
      return renderEmailHtml(title, `<p style="font-size:16px;color:#4a5568;line-height:1.6;margin:0 0 16px;">${escapeBody(body)}</p>`);
  }
}

function escapeBody(body: string): string {
  return body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getRecipientEmail(data?: Record<string, unknown>): string | undefined {
  return data?.email as string | undefined;
}

export function createResendProvider(): NotificationDeliveryProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resendInstance: any = null;

  return {
    name: 'resend-email',

    isAvailable(): boolean {
      return !!process.env.RESEND_API_KEY;
    },

    async deliver(params: {
      type: NotificationType;
      userId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }): Promise<{ delivered: boolean; error?: string }> {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return { delivered: false, error: 'RESEND_API_KEY not configured' };
      }

      const recipientEmail = getRecipientEmail(params.data);
      if (!recipientEmail) {
        return { delivered: false, error: 'no_recipient_email' };
      }

      const subject = EMAIL_SUBJECTS[params.type] ?? params.title;
      const html = buildRichHtml(params.type, params.title, params.body, params.data);

      try {
        if (!resendInstance) {
          const { Resend } = await import('resend');
          resendInstance = new Resend(apiKey);
        }

        const result = await resendInstance.emails.send({
          from: 'RideNDine <noreply@ridendine.ca>',
          to: recipientEmail,
          subject,
          html,
        });

        if (result.error) {
          return { delivered: false, error: result.error.message };
        }

        return { delivered: true };
      } catch (error) {
        return {
          delivered: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
