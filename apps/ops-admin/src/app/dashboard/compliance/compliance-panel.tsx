import Link from 'next/link';
import { Card, StatusBadge } from '@ridendine/ui';
import {
  type ComplianceDocumentView,
  type ComplianceRiskLevel,
  type ComplianceSubject,
  getComplianceTone,
  getDocumentTone,
} from './compliance-model';

const riskClasses: Record<ComplianceRiskLevel, string> = {
  critical: 'border-danger/40 bg-danger/10',
  warning: 'border-warning/40 bg-warning/10',
  attention: 'border-info/40 bg-info/10',
  healthy: 'border-success/40 bg-success/10',
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function DocumentRow({ document }: { document: ComplianceDocumentView }) {
  return (
    <div className="grid gap-3 border-t border-divider py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-medium text-text">{document.label}</p>
        {document.notes && <p className="mt-1 text-xs text-textMuted">{document.notes}</p>}
      </div>
      <StatusBadge
        status={getDocumentTone(document)}
        label={document.statusLabel}
        withDot={false}
        className="w-fit"
      />
      <span className="text-xs text-textMuted">{document.expiryLabel}</span>
      <a
        href={document.document_url}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-primary hover:underline"
      >
        Open
      </a>
    </div>
  );
}
export function CompliancePanel({
  subject,
  detailHref,
}: {
  subject: ComplianceSubject;
  detailHref?: string;
}) {
  const reviewedDates = subject.documents
    .map((document) => document.reviewed_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  const lastReviewedAt =
    reviewedDates.length > 0 ? reviewedDates[reviewedDates.length - 1] : null;

  return (
    <Card className={`border p-5 ${riskClasses[subject.riskLevel]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-text">{subject.ownerName}</p>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-textMuted">
              {subject.ownerType}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-textMuted">
              {subject.ownerStatus}
            </span>
          </div>
          <p className="mt-2 text-sm text-textMuted">{subject.primaryAction}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={getComplianceTone(subject.riskLevel)}
            label={subject.riskLevel}
            withDot={false}
          />
          {detailHref && (
            <Link href={detailHref} className="text-sm font-medium text-primary hover:underline">
              Open profile
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-textMuted">Documents</p>
          <p className="text-lg font-semibold text-text">{subject.summary.totalDocuments}</p>
        </div>
        <div>
          <p className="text-xs text-textMuted">Missing</p>
          <p className="text-lg font-semibold text-text">{subject.summary.missingRequired}</p>
        </div>
        <div>
          <p className="text-xs text-textMuted">Pending</p>
          <p className="text-lg font-semibold text-text">{subject.summary.pendingReview}</p>
        </div>
        <div>
          <p className="text-xs text-textMuted">Expiry risk</p>
          <p className="text-lg font-semibold text-text">
            {subject.summary.expired + subject.summary.expiringSoon}
          </p>
        </div>
      </div>

      {subject.missingRequiredLabels.length > 0 && (
        <div className="mt-4 rounded-md border border-border bg-surface/80 p-3">
          <p className="text-xs font-semibold uppercase text-textMuted">
            Missing required
          </p>
          <p className="mt-1 text-sm text-text">{subject.missingRequiredLabels.join(', ')}</p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text">Document Evidence</h3>
          <span className="text-xs text-textMuted">
            Required: {subject.requiredDocumentLabels.join(', ')}
          </span>
        </div>

        {subject.documents.length > 0 ? (
          <div className="mt-2">
            {subject.documents.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-textMuted">
            No document evidence is recorded.
          </div>
        )}
      </div>

      {subject.documents.length > 0 && (
        <p className="mt-3 text-xs text-textMuted">
          Last review: {formatDate(lastReviewedAt)}
        </p>
      )}
    </Card>
  );
}
