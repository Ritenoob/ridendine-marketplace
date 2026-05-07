// ==========================================
// SCHEDULING UTILITIES
// For order pre-scheduling / delivery time picker
// ==========================================

const MIN_SCHEDULE_MS = 60 * 60 * 1000; // 1 hour
const MAX_SCHEDULE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ValidationResult {
  valid: true;
  value: string | null;
}

export interface ValidationError {
  valid: false;
  error: string;
}

export type ScheduleValidation = ValidationResult | ValidationError;

/** Validate a scheduledFor ISO string from the request body. */
export function validateScheduledFor(
  input: string | null | undefined
): ScheduleValidation {
  if (input == null) {
    return { valid: true, value: null };
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid scheduled_for date' };
  }

  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff < MIN_SCHEDULE_MS) {
    return {
      valid: false,
      error: 'Scheduled time must be at least 1 hour in the future',
    };
  }

  if (diff > MAX_SCHEDULE_MS) {
    return {
      valid: false,
      error: 'Scheduled time must be within 7 days from now',
    };
  }

  return { valid: true, value: input };
}

/** Format a scheduled ISO timestamp for display. Returns null for ASAP orders. */
export function formatScheduledTime(
  scheduledFor: string | null | undefined
): string | null {
  if (!scheduledFor) return null;
  const date = new Date(scheduledFor);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Returns true if the order has a scheduled delivery time. */
export function isScheduledOrder(
  scheduledFor: string | null | undefined
): boolean {
  return typeof scheduledFor === 'string' && scheduledFor.length > 0;
}

/** Generate 30-min time slots for a given date between startHour and endHour. */
export function generateTimeSlots(
  date: Date,
  startHour = 10,
  endHour = 21
): Date[] {
  const slots: Date[] = [];
  const minTime = Date.now() + MIN_SCHEDULE_MS;

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      const slot = new Date(date);
      slot.setHours(hour, minute, 0, 0);
      if (slot.getTime() >= minTime) {
        slots.push(slot);
      }
    }
  }

  return slots;
}

/** Get the next 7 calendar days starting from today. */
export function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}
