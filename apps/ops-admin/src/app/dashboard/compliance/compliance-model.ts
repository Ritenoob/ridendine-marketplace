export type ComplianceOwnerType = 'chef' | 'driver';
export type ComplianceRiskLevel = 'critical' | 'warning' | 'attention' | 'healthy';
export type ComplianceExpiryState = 'none' | 'current' | 'expiring_soon' | 'expiring_urgent' | 'expired';
export type ComplianceTone = 'danger' | 'warning' | 'info' | 'success' | 'idle';

export interface ComplianceDocumentRow {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
  expires_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocumentView extends ComplianceDocumentRow {
  label: string;
  expiryState: ComplianceExpiryState;
  daysUntilExpiry: number | null;
  expiryLabel: string;
  statusLabel: string;
}

export interface ComplianceSubjectInput {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  ownerName: string;
  ownerStatus: string;
  documents: ComplianceDocumentRow[];
  now?: Date;
}

export interface ComplianceSubjectSummary {
  totalDocuments: number;
  missingRequired: number;
  pendingReview: number;
  rejected: number;
  expired: number;
  expiringSoon: number;
  missingExpiry: number;
}

export interface ComplianceSubject {
  ownerType: ComplianceOwnerType;
  ownerId: string;
  ownerName: string;
  ownerStatus: string;
  documents: ComplianceDocumentView[];
  requiredDocumentTypes: string[];
  requiredDocumentLabels: string[];
  missingRequiredTypes: string[];
  missingRequiredLabels: string[];
  summary: ComplianceSubjectSummary;
  riskLevel: ComplianceRiskLevel;
  primaryAction: string;
}

export interface ComplianceQueueSummary {
  totalSubjects: number;
  criticalSubjects: number;
  warningSubjects: number;
  attentionSubjects: number;
  healthySubjects: number;
  missingRequired: number;
  pendingReview: number;
  expired: number;
  expiringSoon: number;
}

export interface ComplianceQueue {
  subjects: ComplianceSubject[];
  reviewQueue: ComplianceSubject[];
  summary: ComplianceQueueSummary;
}

export const REQUIRED_CHEF_DOCUMENT_TYPES = [
  'food_handler_certificate',
  'business_license',
  'insurance',
  'kitchen_inspection',
];

export const REQUIRED_DRIVER_DOCUMENT_TYPES = [
  'drivers_license',
  'vehicle_registration',
  'vehicle_insurance',
];

const DOCUMENT_LABELS: Record<string, string> = {
  food_handler_certificate: 'Food Handler Certificate',
  kitchen_inspection: 'Kitchen Inspection',
  business_license: 'Business License',
  insurance: 'Insurance',
  drivers_license: 'Drivers License',
  vehicle_registration: 'Vehicle Registration',
  vehicle_insurance: 'Vehicle Insurance',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;
const EXPIRING_URGENT_DAYS = 7;

export function formatComplianceDocumentType(type: string): string {
  return DOCUMENT_LABELS[type] ?? type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatComplianceStatus(status: string): string {
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getRequiredDocumentTypes(ownerType: ComplianceOwnerType): string[] {
  return ownerType === 'chef'
    ? REQUIRED_CHEF_DOCUMENT_TYPES
    : REQUIRED_DRIVER_DOCUMENT_TYPES;
}

export function getComplianceTone(riskLevel: ComplianceRiskLevel): ComplianceTone {
  if (riskLevel === 'critical') return 'danger';
  if (riskLevel === 'warning') return 'warning';
  if (riskLevel === 'attention') return 'info';
  return 'success';
}

export function getDocumentTone(document: Pick<ComplianceDocumentView, 'status' | 'expiryState'>): ComplianceTone {
  if (document.status === 'rejected' || document.status === 'expired' || document.expiryState === 'expired') {
    return 'danger';
  }
  if (document.expiryState === 'expiring_urgent') return 'danger';
  if (document.status === 'pending' || document.expiryState === 'expiring_soon') return 'warning';
  if (document.status === 'approved') return 'success';
  return 'idle';
}

function getExpiryState(expiresAt: string | null, status: string, now: Date): {
  expiryState: ComplianceExpiryState;
  daysUntilExpiry: number | null;
  expiryLabel: string;
} {
  if (status === 'expired') {
    return { expiryState: 'expired', daysUntilExpiry: null, expiryLabel: 'Expired' };
  }

  if (!expiresAt) {
    return { expiryState: 'none', daysUntilExpiry: null, expiryLabel: 'No expiry recorded' };
  }

  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) {
    return { expiryState: 'none', daysUntilExpiry: null, expiryLabel: 'Invalid expiry date' };
  }

  const daysUntilExpiry = Math.ceil((expiryTime - now.getTime()) / DAY_MS);

  if (daysUntilExpiry < 0) {
    return { expiryState: 'expired', daysUntilExpiry, expiryLabel: 'Expired' };
  }

  if (daysUntilExpiry <= EXPIRING_URGENT_DAYS) {
    return {
      expiryState: 'expiring_urgent',
      daysUntilExpiry,
      expiryLabel: `Expires in ${daysUntilExpiry}d`,
    };
  }

  if (daysUntilExpiry <= EXPIRING_SOON_DAYS) {
    return {
      expiryState: 'expiring_soon',
      daysUntilExpiry,
      expiryLabel: `Expires in ${daysUntilExpiry}d`,
    };
  }

  return {
    expiryState: 'current',
    daysUntilExpiry,
    expiryLabel: `Expires in ${daysUntilExpiry}d`,
  };
}
function buildDocumentView(document: ComplianceDocumentRow, now: Date): ComplianceDocumentView {
  const expiry = getExpiryState(document.expires_at, document.status, now);
  return {
    ...document,
    label: formatComplianceDocumentType(document.document_type),
    statusLabel: formatComplianceStatus(document.status),
    ...expiry,
  };
}

function calculateRiskLevel(
  ownerStatus: string,
  summary: ComplianceSubjectSummary
): ComplianceRiskLevel {
  const activeProfile = ownerStatus === 'approved' || ownerStatus === 'suspended';

  if (
    summary.rejected > 0 ||
    summary.expired > 0 ||
    (activeProfile && summary.missingRequired > 0)
  ) {
    return 'critical';
  }

  if (
    summary.expiringSoon > 0 ||
    summary.pendingReview > 0 ||
    summary.missingRequired > 0
  ) {
    return 'warning';
  }

  if (summary.missingExpiry > 0) return 'attention';
  return 'healthy';
}

function getPrimaryAction(subject: Pick<ComplianceSubject, 'riskLevel' | 'summary' | 'ownerStatus'>): string {
  if (subject.summary.missingRequired > 0 && (subject.ownerStatus === 'approved' || subject.ownerStatus === 'suspended')) {
    return 'Collect missing documents before marketplace activity continues.';
  }
  if (subject.summary.expired > 0) return 'Review expired documents and suspend or renew if needed.';
  if (subject.summary.rejected > 0) return 'Resolve rejected document evidence before approval.';
  if (subject.summary.pendingReview > 0) return 'Review pending documents.';
  if (subject.summary.expiringSoon > 0) return 'Request renewal before expiry.';
  if (subject.summary.missingRequired > 0) return 'Collect missing onboarding documents.';
  if (subject.summary.missingExpiry > 0) return 'Add expiry dates where required.';
  return 'No immediate compliance action.';
}

export function buildComplianceSubject(input: ComplianceSubjectInput): ComplianceSubject {
  const now = input.now ?? new Date();
  const documents = input.documents.map((document) => buildDocumentView(document, now));
  const requiredDocumentTypes = getRequiredDocumentTypes(input.ownerType);
  const presentTypes = new Set(documents.map((document) => document.document_type));
  const missingRequiredTypes = requiredDocumentTypes.filter((type) => !presentTypes.has(type));

  const summary: ComplianceSubjectSummary = {
    totalDocuments: documents.length,
    missingRequired: missingRequiredTypes.length,
    pendingReview: documents.filter((document) => document.status === 'pending').length,
    rejected: documents.filter((document) => document.status === 'rejected').length,
    expired: documents.filter((document) => document.expiryState === 'expired').length,
    expiringSoon: documents.filter((document) =>
      document.expiryState === 'expiring_soon' || document.expiryState === 'expiring_urgent'
    ).length,
    missingExpiry: documents.filter((document) => document.expiryState === 'none').length,
  };

  const partialSubject = {
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerStatus: input.ownerStatus,
    documents,
    requiredDocumentTypes,
    requiredDocumentLabels: requiredDocumentTypes.map(formatComplianceDocumentType),
    missingRequiredTypes,
    missingRequiredLabels: missingRequiredTypes.map(formatComplianceDocumentType),
    summary,
    riskLevel: calculateRiskLevel(input.ownerStatus, summary),
  };

  return {
    ...partialSubject,
    primaryAction: getPrimaryAction(partialSubject),
  };
}

function getRiskScore(subject: ComplianceSubject): number {
  const levelScore: Record<ComplianceRiskLevel, number> = {
    critical: 3000,
    warning: 2000,
    attention: 1000,
    healthy: 0,
  };

  return (
    levelScore[subject.riskLevel] +
    subject.summary.expired * 100 +
    subject.summary.rejected * 90 +
    subject.summary.missingRequired * 40 +
    subject.summary.expiringSoon * 20 +
    subject.summary.pendingReview * 10
  );
}

export function buildComplianceQueue(subjects: ComplianceSubject[]): ComplianceQueue {
  const reviewQueue = subjects
    .filter((subject) => subject.riskLevel !== 'healthy')
    .sort((a, b) => {
      const scoreDiff = getRiskScore(b) - getRiskScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.ownerName.localeCompare(b.ownerName);
    });

  return {
    subjects,
    reviewQueue,
    summary: {
      totalSubjects: subjects.length,
      criticalSubjects: subjects.filter((subject) => subject.riskLevel === 'critical').length,
      warningSubjects: subjects.filter((subject) => subject.riskLevel === 'warning').length,
      attentionSubjects: subjects.filter((subject) => subject.riskLevel === 'attention').length,
      healthySubjects: subjects.filter((subject) => subject.riskLevel === 'healthy').length,
      missingRequired: subjects.reduce((sum, subject) => sum + subject.summary.missingRequired, 0),
      pendingReview: subjects.reduce((sum, subject) => sum + subject.summary.pendingReview, 0),
      expired: subjects.reduce((sum, subject) => sum + subject.summary.expired, 0),
      expiringSoon: subjects.reduce((sum, subject) => sum + subject.summary.expiringSoon, 0),
    },
  };
}
