import {
  buildFinanceTraceSummary,
  formatFinanceCents,
  formatLedgerEntryType,
  getLedgerEntryTone,
} from '../finance-trace-model';

describe('finance trace model', () => {
  it('summarizes ledger evidence for an ops order detail finance trace', () => {
    const summary = buildFinanceTraceSummary({
      platformFee: 2.25,
      chefPayable: 9,
      driverPayable: 4,
      tipPayable: 1,
      total: 25,
      ledgerEntries: [
        {
          id: 'le_capture',
          type: 'customer_charge_capture',
          amountCents: 2500,
          currency: 'CAD',
          description: 'Payment captured',
          stripeId: 'pi_123',
          createdAt: '2026-06-06T10:00:00Z',
        },
        {
          id: 'le_platform',
          type: 'platform_fee',
          amountCents: 225,
          currency: 'CAD',
          description: 'Platform fee',
          createdAt: '2026-06-06T10:01:00Z',
        },
        {
          id: 'le_chef',
          type: 'chef_payable',
          amountCents: 900,
          currency: 'CAD',
          description: 'Chef payable',
          entityType: 'chef',
          entityId: 'chef_1',
          createdAt: '2026-06-06T10:02:00Z',
        },
        {
          id: 'le_driver',
          type: 'driver_payable',
          amountCents: 400,
          currency: 'CAD',
          description: 'Driver payable',
          entityType: 'driver',
          entityId: 'driver_1',
          createdAt: '2026-06-06T10:03:00Z',
        },
        {
          id: 'le_refund',
          type: 'customer_partial_refund',
          amountCents: -500,
          currency: 'CAD',
          description: 'Partial refund',
          stripeId: 're_123',
          createdAt: '2026-06-06T10:04:00Z',
        },
      ],
    });

    expect(summary.ledgerEntryCount).toBe(5);
    expect(summary.stripeReferenceCount).toBe(2);
    expect(summary.customerChargeCents).toBe(2500);
    expect(summary.refundCents).toBe(500);
    expect(summary.payableCents).toBe(1400);
    expect(summary.platformFeeCents).toBe(225);
    expect(summary.warnings).toEqual([]);
  });

  it('flags missing ledger and missing Stripe evidence for review', () => {
    expect(
      buildFinanceTraceSummary({
        total: 25,
        ledgerEntries: [],
      }).warnings
    ).toContain('No ledger entries are recorded for this order yet.');

    expect(
      buildFinanceTraceSummary({
        total: 25,
        ledgerEntries: [
          {
            id: 'le_chef',
            type: 'chef_payable',
            amountCents: 900,
            currency: 'CAD',
            description: 'Chef payable',
          },
        ],
      }).warnings
    ).toContain('No Stripe references are attached to this order ledger yet.');
  });

  it('formats ledger labels, currency, and amount tone', () => {
    expect(formatLedgerEntryType('customer_charge_capture')).toBe('Customer Charge Capture');
    expect(formatFinanceCents(12345)).toBe('$123.45');
    expect(formatFinanceCents(-500)).toBe('-$5.00');
    expect(getLedgerEntryTone({ type: 'customer_partial_refund', amountCents: -500 })).toBe('negative');
    expect(getLedgerEntryTone({ type: 'chef_payable', amountCents: 900 })).toBe('positive');
  });
});
