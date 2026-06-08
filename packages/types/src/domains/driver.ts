// ==========================================
// DRIVER DOMAIN TYPES
// ==========================================

import { DocumentType } from '../enums';
import type {
  DriverStatus,
  DriverPresenceStatus,
  DocumentType as DocumentTypeValue,
  DocumentStatus,
} from '../enums';
import type { BankPayoutStatus } from './chef';

export const REQUIRED_DRIVER_DOCUMENT_TYPES = [
  DocumentType.DRIVERS_LICENSE,
  DocumentType.VEHICLE_REGISTRATION,
  DocumentType.VEHICLE_INSURANCE,
] as const;

export type RequiredDriverDocumentType = typeof REQUIRED_DRIVER_DOCUMENT_TYPES[number];

export interface DriverComplianceDocumentInput {
  readonly document_type?: string | null;
  readonly status?: string | null;
  readonly expires_at?: string | null;
}

export interface DriverComplianceSummary {
  readonly totalDocuments: number;
  readonly missingRequired: number;
  readonly pendingReview: number;
  readonly rejected: number;
  readonly expired: number;
  readonly openItems: number;
  readonly missingRequiredTypes: RequiredDriverDocumentType[];
}

function normalizeDocumentValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isDocumentExpired(status: string, expiresAt: string | null | undefined, now: Date): boolean {
  if (status === 'expired') return true;
  if (!expiresAt) return false;

  const expiryTime = Date.parse(expiresAt);
  return Number.isFinite(expiryTime) && expiryTime < now.getTime();
}

export function summarizeDriverComplianceDocuments(
  rows: readonly DriverComplianceDocumentInput[] | null | undefined,
  now = new Date()
): DriverComplianceSummary {
  const documents = Array.isArray(rows) ? rows : [];
  const requiredTypes = new Set<string>(REQUIRED_DRIVER_DOCUMENT_TYPES);
  const approvedCurrentRequiredTypes = new Set<string>();
  let pendingReview = 0;
  let rejected = 0;
  let expired = 0;
  let nonRequiredOpenItems = 0;

  for (const document of documents) {
    const documentType = normalizeDocumentValue(document.document_type);
    const status = normalizeDocumentValue(document.status);
    const documentExpired = isDocumentExpired(status, document.expires_at, now);
    const required = requiredTypes.has(documentType);
    const approvedCurrent = status === 'approved' && !documentExpired;

    if (status === 'pending' || status === 'submitted' || status === 'in_review') {
      pendingReview += 1;
    }
    if (status === 'rejected') {
      rejected += 1;
    }
    if (documentExpired) {
      expired += 1;
    }

    if (required && approvedCurrent) {
      approvedCurrentRequiredTypes.add(documentType);
    } else if (!required && !approvedCurrent) {
      nonRequiredOpenItems += 1;
    }
  }

  const missingRequiredTypes = REQUIRED_DRIVER_DOCUMENT_TYPES.filter(
    (documentType) => !approvedCurrentRequiredTypes.has(documentType)
  );

  return {
    totalDocuments: documents.length,
    missingRequired: missingRequiredTypes.length,
    pendingReview,
    rejected,
    expired,
    openItems: missingRequiredTypes.length + nonRequiredOpenItems,
    missingRequiredTypes,
  };
}

export interface Driver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  profile_image_url: string | null;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: DocumentTypeValue;
  document_url: string;
  status: DocumentStatus;
  expires_at: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverVehicle {
  id: string;
  driver_id: string;
  vehicle_type: 'car' | 'motorcycle' | 'bicycle' | 'scooter';
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverShift {
  id: string;
  driver_id: string;
  started_at: string;
  ended_at: string | null;
  total_deliveries: number;
  total_earnings: number;
  total_distance_km: number | null;
  created_at: string;
  updated_at: string;
}

export interface DriverPresence {
  id: string;
  driver_id: string;
  status: DriverPresenceStatus;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  current_shift_id: string | null;
  updated_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  shift_id: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
}

export interface DriverEarning {
  id: string;
  driver_id: string;
  delivery_id: string;
  shift_id: string | null;
  base_amount: number;
  tip_amount: number;
  bonus_amount: number;
  total_amount: number;
  created_at: string;
}

export interface DriverPayout {
  id: string;
  driver_id: string;
  payout_run_id: string | null;
  amount: number;
  status: BankPayoutStatus;
  payment_rail: 'bank';
  bank_batch_id: string | null;
  bank_reference: string | null;
  reconciliation_status: 'pending' | 'reconciled' | 'disputed';
  stripe_transfer_id: string | null;
  period_start: string;
  period_end: string;
  approved_by: string | null;
  approved_at: string | null;
  executed_by: string | null;
  executed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// Aggregate types for UI
export interface DriverWithDetails extends Driver {
  vehicle: DriverVehicle | null;
  presence: DriverPresence | null;
  documents: DriverDocument[];
}

export interface DriverShiftSummary extends DriverShift {
  earnings: DriverEarning[];
}
