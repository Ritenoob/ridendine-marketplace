import {
  buildComplianceQueue,
  buildComplianceSubject,
  formatComplianceDocumentType,
  getComplianceTone,
} from '../compliance-model';

const now = new Date('2026-06-06T12:00:00Z');

describe('compliance model', () => {
  it('flags approved chefs that are missing required documents as critical', () => {
    const subject = buildComplianceSubject({
      ownerType: 'chef',
      ownerId: 'chef_1',
      ownerName: 'Chef One',
      ownerStatus: 'approved',
      documents: [
        {
          id: 'doc_food',
          document_type: 'food_handler_certificate',
          document_url: 'https://example.test/food.pdf',
          status: 'approved',
          expires_at: '2026-08-01T00:00:00Z',
          reviewed_by: 'ops_1',
          reviewed_at: '2026-05-01T00:00:00Z',
          notes: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      now,
    });

    expect(subject.requiredDocumentLabels).toEqual([
      'Food Handler Certificate',
      'Business License',
      'Insurance',
      'Kitchen Inspection',
    ]);
    expect(subject.missingRequiredLabels).toEqual([
      'Business License',
      'Insurance',
      'Kitchen Inspection',
    ]);
    expect(subject.summary.missingRequired).toBe(3);
    expect(subject.riskLevel).toBe('critical');
    expect(subject.primaryAction).toBe('Collect missing documents before marketplace activity continues.');
  });

  it('calculates expired and expiring driver document risk', () => {
    const subject = buildComplianceSubject({
      ownerType: 'driver',
      ownerId: 'driver_1',
      ownerName: 'Driver One',
      ownerStatus: 'pending',
      documents: [
        {
          id: 'doc_license',
          document_type: 'drivers_license',
          document_url: 'https://example.test/license.pdf',
          status: 'approved',
          expires_at: '2026-06-04T00:00:00Z',
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'doc_insurance',
          document_type: 'vehicle_insurance',
          document_url: 'https://example.test/insurance.pdf',
          status: 'pending',
          expires_at: '2026-06-20T00:00:00Z',
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      now,
    });

    expect(subject.summary.expired).toBe(1);
    expect(subject.summary.expiringSoon).toBe(1);
    expect(subject.summary.pendingReview).toBe(1);
    expect(subject.summary.missingRequired).toBe(1);
    expect(subject.riskLevel).toBe('critical');
    expect(subject.documents.map((doc) => doc.expiryState)).toEqual(['expired', 'expiring_soon']);
  });

  it('summarizes and orders the mixed compliance queue by risk', () => {
    const chef = buildComplianceSubject({
      ownerType: 'chef',
      ownerId: 'chef_1',
      ownerName: 'Chef One',
      ownerStatus: 'approved',
      documents: [],
      now,
    });
    const driver = buildComplianceSubject({
      ownerType: 'driver',
      ownerId: 'driver_1',
      ownerName: 'Driver One',
      ownerStatus: 'pending',
      documents: [
        {
          id: 'doc_registration',
          document_type: 'vehicle_registration',
          document_url: 'https://example.test/registration.pdf',
          status: 'approved',
          expires_at: '2026-11-01T00:00:00Z',
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ],
      now,
    });

    const queue = buildComplianceQueue([driver, chef]);

    expect(queue.summary.totalSubjects).toBe(2);
    expect(queue.summary.criticalSubjects).toBe(1);
    expect(queue.summary.warningSubjects).toBe(1);
    expect(queue.summary.missingRequired).toBe(6);
    expect(queue.reviewQueue.map((item) => item.ownerId)).toEqual(['chef_1', 'driver_1']);
  });

  it('formats document labels and tone classes consistently', () => {
    expect(formatComplianceDocumentType('vehicle_insurance')).toBe('Vehicle Insurance');
    expect(getComplianceTone('critical')).toBe('danger');
    expect(getComplianceTone('warning')).toBe('warning');
    expect(getComplianceTone('healthy')).toBe('success');
  });
});
