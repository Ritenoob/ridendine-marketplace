import Link from 'next/link';
import { Card, PageHeader, StatusBadge } from '@ridendine/ui';
import {
  createAdminClient,
  listChefComplianceProfiles,
  listDriverComplianceProfiles,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasPlatformApiCapability } from '@/lib/engine';
import {
  buildComplianceQueue,
  buildComplianceSubject,
  type ComplianceDocumentRow,
  type ComplianceSubject,
  getComplianceTone,
} from './compliance-model';
import { CompliancePanel } from './compliance-panel';

export const dynamic = 'force-dynamic';

type ChefComplianceRow = {
  id: string;
  display_name: string;
  status: string;
  chef_documents: ComplianceDocumentRow[] | null;
};

type DriverComplianceRow = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  driver_documents: ComplianceDocumentRow[] | null;
};

async function loadComplianceSubjects() {
  const client = createAdminClient() as unknown as SupabaseClient;
  const now = new Date();

  const [chefRows, driverRows] = await Promise.all([
    listChefComplianceProfiles(client, 200),
    listDriverComplianceProfiles(client, 200),
  ]);

  const chefSubjects = ((chefRows ?? []) as unknown as ChefComplianceRow[]).map((chef) =>
    buildComplianceSubject({
      ownerType: 'chef',
      ownerId: chef.id,
      ownerName: chef.display_name,
      ownerStatus: chef.status,
      documents: Array.isArray(chef.chef_documents) ? chef.chef_documents : [],
      now,
    })
  );

  const driverSubjects = ((driverRows ?? []) as unknown as DriverComplianceRow[]).map((driver) =>
    buildComplianceSubject({
      ownerType: 'driver',
      ownerId: driver.id,
      ownerName: [driver.first_name, driver.last_name].filter(Boolean).join(' ') || 'Unknown Driver',
      ownerStatus: driver.status,
      documents: Array.isArray(driver.driver_documents) ? driver.driver_documents : [],
      now,
    })
  );

  return {
    chefSubjects,
    driverSubjects,
    queue: buildComplianceQueue([...chefSubjects, ...driverSubjects]),
  };
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
}) {
  const badgeLabel = tone === 'danger' ? 'critical' : tone;

  return (
    <Card className="border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-textMuted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-text">{value.toLocaleString()}</p>
          <p className="mt-1 text-sm text-textMuted">{detail}</p>
        </div>
        <StatusBadge status={tone} label={badgeLabel} withDot={false} />
      </div>
    </Card>
  );
}
function CompactSubjectRow({ subject }: { subject: ComplianceSubject }) {
  const href =
    subject.ownerType === 'chef'
      ? `/dashboard/chefs/${subject.ownerId}`
      : `/dashboard/drivers/${subject.ownerId}`;

  return (
    <div className="grid gap-3 border-t border-divider px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
      <div className="min-w-0">
        <Link href={href} className="font-medium text-text hover:text-primary">
          {subject.ownerName}
        </Link>
        <p className="mt-0.5 text-xs capitalize text-textMuted">
          {subject.ownerType} - {subject.ownerStatus}
        </p>
      </div>
      <StatusBadge
        status={getComplianceTone(subject.riskLevel)}
        label={subject.riskLevel}
        withDot={false}
        className="w-fit"
      />
      <span className="text-xs text-textMuted">
        {subject.summary.missingRequired} missing, {subject.summary.pendingReview} pending
      </span>
      <span className="text-xs text-textMuted">
        {subject.summary.expired + subject.summary.expiringSoon} expiry risk
      </span>
    </div>
  );
}

function SubjectTable({
  title,
  subjects,
}: {
  title: string;
  subjects: ComplianceSubject[];
}) {
  return (
    <Card className="overflow-hidden border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <span className="text-sm text-textMuted">{subjects.length.toLocaleString()}</span>
      </div>
      {subjects.length > 0 ? (
        <div>
          {subjects.map((subject) => (
            <CompactSubjectRow key={`${subject.ownerType}-${subject.ownerId}`} subject={subject} />
          ))}
        </div>
      ) : (
        <div className="border-t border-divider px-4 py-8 text-center text-sm text-textMuted">
          No records found.
        </div>
      )}
    </Card>
  );
}

export default async function CompliancePage() {
  const actor = await getOpsActorContext();

  if (!actor || !hasPlatformApiCapability(actor, 'ops_entity_read')) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-2xl font-bold text-text">Access restricted</h1>
            <p className="mt-2 text-textMuted">
              Compliance document review requires platform entity read access.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  let data: Awaited<ReturnType<typeof loadComplianceSubjects>>;

  try {
    data = await loadComplianceSubjects();
  } catch (error) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-2xl font-bold text-text">Compliance data unavailable</h1>
            <p className="mt-2 text-danger">
              {error instanceof Error ? error.message : 'Unable to load compliance data.'}
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { queue, chefSubjects, driverSubjects } = data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Compliance"
          subtitle="Chef and driver document coverage, review state, and expiry risk."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Critical"
            value={queue.summary.criticalSubjects}
            detail="Requires immediate Ops review"
            tone="danger"
          />
          <SummaryCard
            label="Missing Docs"
            value={queue.summary.missingRequired}
            detail="Required evidence not recorded"
            tone="warning"
          />
          <SummaryCard
            label="Pending Review"
            value={queue.summary.pendingReview}
            detail="Documents awaiting review"
            tone="info"
          />
          <SummaryCard
            label="Expiry Risk"
            value={queue.summary.expired + queue.summary.expiringSoon}
            detail="Expired or inside 30 days"
            tone="warning"
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-text">Review Queue</h2>
            <StatusBadge
              status={queue.reviewQueue.length > 0 ? 'warning' : 'success'}
              label={`${queue.reviewQueue.length} open`}
              withDot={false}
            />
          </div>
          {queue.reviewQueue.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {queue.reviewQueue.slice(0, 12).map((subject) => (
                <CompliancePanel
                  key={`${subject.ownerType}-${subject.ownerId}`}
                  subject={subject}
                  detailHref={
                    subject.ownerType === 'chef'
                      ? `/dashboard/chefs/${subject.ownerId}`
                      : `/dashboard/drivers/${subject.ownerId}`
                  }
                />
              ))}
            </div>
          ) : (
            <Card className="border-border bg-surface px-4 py-8 text-center text-sm text-textMuted">
              No active compliance review items.
            </Card>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <SubjectTable title="Chef Compliance" subjects={chefSubjects} />
          <SubjectTable title="Driver Compliance" subjects={driverSubjects} />
        </div>
      </div>
    </DashboardLayout>
  );
}
