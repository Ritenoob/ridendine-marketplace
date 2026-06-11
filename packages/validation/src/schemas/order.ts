import { z } from 'zod';
import { priceSchema, ratingSchema } from './common';

// ==========================================
// ORDER VALIDATION SCHEMAS
// ==========================================

// NOTE: createOrderSchema was removed — it had no callers anywhere in the
// repo (order creation goes through checkoutSchema in customer.ts).

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'accepted',
    'rejected',
    'preparing',
    'ready_for_pickup',
    'cancelled',
  ]),
  notes: z.string().max(500).nullable().optional(),
  rejectionReason: z.string().max(500).optional(),
});

export const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: ratingSchema,
  comment: z.string().max(2000).nullable().optional(),
});

export const chefRespondToReviewSchema = z.object({
  response: z.string().min(1).max(1000),
});

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

export const processRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: priceSchema,
  reason: z.string().min(1).max(500),
});

// Customer order action schema (web app)
export const customerOrderActionSchema = z.object({
  action: z.enum(['cancel']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Type exports
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ChefRespondToReviewInput = z.infer<typeof chefRespondToReviewSchema>;
export type ApplyPromoCodeInput = z.infer<typeof applyPromoCodeSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
export type CustomerOrderActionInput = z.infer<typeof customerOrderActionSchema>;
