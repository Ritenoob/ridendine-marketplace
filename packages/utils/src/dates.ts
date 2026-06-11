// ==========================================
// DATE UTILITIES
// All display formatters render in the platform's operating timezone
// (America/Toronto) by default — servers run in UTC, users are in Ontario.
// ==========================================

/** Platform operating timezone (Ontario, Canada). */
export const DEFAULT_TIME_ZONE = 'America/Toronto';

export interface DateFormatOptions {
  /** IANA timezone for display. Defaults to America/Toronto. */
  timeZone?: string;
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date, options: DateFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });
}

/**
 * Format a datetime for display
 */
export function formatDateTime(date: string | Date, options: DateFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });
}

/**
 * Format time only
 */
export function formatTime(date: string | Date, options: DateFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
  });
}

/**
 * Get relative time string (e.g., "5 minutes ago").
 * Relative deltas are timezone-independent; the >7-day fallback renders the
 * absolute date in the given (default America/Toronto) timezone.
 */
export function getRelativeTime(date: string | Date, options: DateFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  if (diffHour < 24) {
    return `${diffHour} hr ago`;
  }
  if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
  return formatDate(d, options);
}

/**
 * Get estimated time string (e.g., "in 15-20 min")
 */
export function getEstimatedTime(minMinutes: number, maxMinutes: number): string {
  return `${minMinutes}-${maxMinutes} min`;
}

/** Calendar date (y/m/d) of an instant as observed in a timezone. */
function calendarDateInZone(date: Date, timeZone: string): string {
  // en-CA yields stable YYYY-MM-DD output
  return date.toLocaleDateString('en-CA', { timeZone });
}

/**
 * Check if a date is today, where "today" is computed in the platform
 * timezone (default America/Toronto), not the server's local zone.
 */
export function isToday(date: string | Date, options: DateFormatOptions = {}): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  return calendarDateInZone(d, timeZone) === calendarDateInZone(new Date(), timeZone);
}

/**
 * Get day of week name
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] ?? '';
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Format minutes since midnight to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}
