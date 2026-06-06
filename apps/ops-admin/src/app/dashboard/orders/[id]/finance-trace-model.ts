export type FinanceTraceLedgerEntry = {
  id?: string;
  type?: string;
  amountCents?: number;
  currency?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  stripeId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type FinanceTraceFinancials = {
  platformFee?: number;
  chefPayable?: number;
  driverPayable?: number;
  tipPayable?: number;
  total?: number;
  ledgerEntries?: FinanceTraceLedgerEntry[];
};

export type FinanceTraceSummary = {
  ledgerEntryCount: number;
  stripeReferenceCount: number;
  customerChargeCents: number;
  refundCents: number;
  payableCents: number;
  platformFeeCents: number;
  warnings: string[];
};

const CUSTOMER_CHARGE_TYPES = new Set([
  'customer_charge_auth',
  'customer_charge_capture',
]);

const REFUND_TYPES = new Set([
  'customer_refund',
  'customer_partial_refund',
]);

const PAYABLE_TYPES = new Set([
  'chef_payable',
  'driver_payable',
  'tip_payable',
]);

function toCents(dollars: number | null | undefined): number {
  return Math.round((dollars ?? 0) * 100);
}

export function formatFinanceCents(cents: number | null | undefined): string {
  const value = cents ?? 0;
  const sign = value < 0 ? '-' : '';
  return `${sign}$${(Math.abs(value) / 100).toFixed(2)}`;
}

export function formatLedgerEntryType(type: string | null | undefined): string {
  if (!type) return 'Unknown Entry';
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getLedgerEntryTone(
  entry: Pick<FinanceTraceLedgerEntry, 'type' | 'amountCents'>
): 'positive' | 'negative' | 'neutral' {
  const amount = entry.amountCents ?? 0;
  if (amount < 0 || REFUND_TYPES.has(entry.type ?? '')) return 'negative';
  if (amount > 0) return 'positive';
  return 'neutral';
}

export function buildFinanceTraceSummary(
  financials: FinanceTraceFinancials
): FinanceTraceSummary {
  const entries = financials.ledgerEntries ?? [];
  const sumByType = (types: Set<string>) =>
    entries.reduce((sum, entry) => {
      if (!types.has(entry.type ?? '')) return sum;
      return sum + (entry.amountCents ?? 0);
    }, 0);

  const customerChargeCents = sumByType(CUSTOMER_CHARGE_TYPES);
  const refundCents = Math.abs(sumByType(REFUND_TYPES));
  const payableCents = sumByType(PAYABLE_TYPES);
  const platformFeeCents = toCents(financials.platformFee);
  const stripeReferenceCount = entries.filter((entry) => Boolean(entry.stripeId)).length;
  const warnings: string[] = [];

  if (entries.length === 0) {
    warnings.push('No ledger entries are recorded for this order yet.');
  } else if (stripeReferenceCount === 0) {
    warnings.push('No Stripe references are attached to this order ledger yet.');
  }

  return {
    ledgerEntryCount: entries.length,
    stripeReferenceCount,
    customerChargeCents,
    refundCents,
    payableCents,
    platformFeeCents,
    warnings,
  };
}
