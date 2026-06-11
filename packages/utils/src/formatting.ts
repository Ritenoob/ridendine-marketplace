// ==========================================
// FORMATTING UTILITIES
// ==========================================

/**
 * Format a DOLLAR amount as currency.
 *
 * Platform convention: app-layer monetary amounts are dollars (CAD).
 * Pass cents? Use {@link formatCurrencyFromCents} instead.
 */
export function formatCurrency(
  amount: number,
  currency = 'CAD',
  locale = 'en-CA'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a CENTS amount as currency (e.g. Stripe amounts).
 */
export function formatCurrencyFromCents(
  cents: number,
  currency = 'CAD',
  locale = 'en-CA'
): string {
  return formatCurrency(cents / 100, currency, locale);
}

/**
 * @deprecated `formatCurrency` now takes dollars directly — use it instead.
 */
export function formatCurrencyFromDollars(
  amount: number,
  currency = 'CAD',
  locale = 'en-CA'
): string {
  return formatCurrency(amount, currency, locale);
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format a distance in kilometers
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format a duration in minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Format a rating as stars
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert string to slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  return `#${orderNumber}`;
}

/**
 * Format address for single-line display
 */
export function formatAddressSingleLine(address: {
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
}): string {
  const parts = [address.address_line1];
  if (address.address_line2) {
    parts.push(address.address_line2);
  }
  parts.push(`${address.city}, ${address.state} ${address.postal_code}`);
  return parts.join(', ');
}
