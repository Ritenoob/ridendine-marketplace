import Link from 'next/link';
import { Card } from '@ridendine/ui';

export type OpsReadinessStatus = 'healthy' | 'degraded' | 'down';

export interface OpsReadinessItem {
  label: string;
  status: OpsReadinessStatus;
  detail: string;
  href?: string;
}

const statusClass: Record<OpsReadinessStatus, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  degraded: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  down: 'border-red-500/30 bg-red-500/10 text-red-100',
};

function ReadinessContent({ item }: { item: OpsReadinessItem }) {
  return (
    <div className={`h-full rounded-lg border p-3 ${statusClass[item.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{item.label}</p>
        <span className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          {item.status}
        </span>
      </div>
      <p className="mt-1 text-xs opacity-80">{item.detail}</p>
    </div>
  );
}

export function OpsReadiness({ items }: { items: OpsReadinessItem[] }) {
  return (
    <Card className="border-gray-800 bg-opsPanel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Ops Readiness</p>
          <p className="text-xs text-gray-500">Runtime wiring and operational health</p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex h-8 items-center rounded-lg border border-gray-700 px-3 text-sm font-medium text-gray-300 transition-colors hover:border-[#E85D26] hover:text-white"
        >
          Diagnostics
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) =>
          item.href ? (
            <Link key={item.label} href={item.href} className="block">
              <ReadinessContent item={item} />
            </Link>
          ) : (
            <ReadinessContent key={item.label} item={item} />
          )
        )}
      </div>
    </Card>
  );
}
