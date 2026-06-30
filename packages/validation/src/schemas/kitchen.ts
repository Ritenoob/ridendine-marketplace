import { z } from 'zod';

// ==========================================
// KITCHEN (Stage 5) VALIDATION SCHEMAS
//
// Internal kitchen workflow inputs. These validate chef-facing kitchen
// mutations; they never touch the public order status (that goes through the
// order engine's action contract).
// ==========================================

export const kitchenTicketStatusSchema = z.enum([
  'new',
  'accepted',
  'preparing',
  'packing',
  'ready',
  'problem',
  'completed',
  'cancelled',
]);

export type KitchenTicketStatusInput = z.infer<typeof kitchenTicketStatusSchema>;

// Move a kitchen ticket to a new internal status. `problemReason` is required
// when flagging a problem.
export const updateKitchenTicketSchema = z
  .object({
    toStatus: kitchenTicketStatusSchema,
    stationId: z.string().uuid().nullable().optional(),
    priority: z.number().int().min(0).max(10).optional(),
    problemReason: z.string().max(500).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.toStatus !== 'problem' || Boolean(v.problemReason && v.problemReason.trim()), {
    message: 'problemReason is required when flagging a problem',
    path: ['problemReason'],
  });

export const kitchenStationSchema = z.object({
  name: z.string().min(1).max(60),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const updateKitchenStationSchema = kitchenStationSchema.partial();

export const kitchenTicketItemStatusSchema = z.enum(['pending', 'in_progress', 'done']);

export const updateKitchenTicketItemSchema = z.object({
  status: kitchenTicketItemStatusSchema,
  stationId: z.string().uuid().nullable().optional(),
});

// Packing / handoff checklist for an order.
export const packChecklistSchema = z.object({
  ticketId: z.string().uuid().nullable().optional(),
  checkedItems: z.array(z.string().max(200)).max(200).default([]),
  bagCount: z.number().int().min(1).max(50).default(1),
  utensilsIncluded: z.boolean().default(false),
  saucesIncluded: z.boolean().default(false),
  allergyLabelApplied: z.boolean().default(false),
  sealed: z.boolean().default(false),
  photoUrl: z.string().url().max(2048).nullable().optional(),
});

export type PackChecklistInput = z.infer<typeof packChecklistSchema>;
export type KitchenStationInput = z.infer<typeof kitchenStationSchema>;
export type UpdateKitchenTicketInput = z.infer<typeof updateKitchenTicketSchema>;
