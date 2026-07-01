import { z } from 'zod';

// ==========================================
// LABOUR (Stage 10) VALIDATION SCHEMAS
// ==========================================

export const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(80).nullable().optional(),
  stationId: z.string().uuid().nullable().optional(),
  hourlyRate: z.number().min(0).max(100_000).default(0),
  userId: z.string().uuid().nullable().optional(),
});

export const updateStaffSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    role: z.string().max(80).nullable().optional(),
    stationId: z.string().uuid().nullable().optional(),
    hourlyRate: z.number().min(0).max(100_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const createShiftSchema = z
  .object({
    staffId: z.string().uuid(),
    scheduledStart: z.string().datetime({ offset: true }),
    scheduledEnd: z.string().datetime({ offset: true }),
    role: z.string().max(80).nullable().optional(),
    stationId: z.string().uuid().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => Date.parse(v.scheduledEnd) > Date.parse(v.scheduledStart), {
    message: 'scheduledEnd must be after scheduledStart',
    path: ['scheduledEnd'],
  });

export const clockInSchema = z.object({
  staffId: z.string().uuid(),
  shiftId: z.string().uuid().nullable().optional(),
});

export const clockOutSchema = z
  .object({
    timeEntryId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.timeEntryId || v.staffId), {
    message: 'Provide timeEntryId or staffId',
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
