import Link from 'next/link';
import { Card } from '@ridendine/ui';
import {
  CONTROL_CENTER_AREAS,
  getControlCenterSummary,
  type ControlCenterTone,
} from './control-center-model';

const toneClass: Record<ControlCenterTone, string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  neutral: 'border-gray-700 bg-[#101827] text-gray-200',
};

export function ControlCenter() {
  const summary = getControlCenterSummary();

  return (
    <Card className="border-gray-800 bg-opsPanel p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Admin Control Center</p>
          <p className="text-xs text-gray-500">
            {summary.wiredAreas}/{summary.totalAreas} domains wired · {summary.totalActions} operator actions mapped
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-700 px-3 text-sm font-medium text-gray-300 transition-colors hover:border-[#E85D26] hover:text-white"
        >
          Engine settings
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CONTROL_CENTER_AREAS.map((area) => (
          <Link
            key={area.key}
            href={area.href}
            className={`block rounded-lg border p-3 transition-colors hover:border-[#E85D26] ${toneClass[area.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{area.title}</p>
                <p className="mt-1 line-clamp-2 text-xs opacity-80">{area.purpose}</p>
              </div>
              <span className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-80">
                {area.apiRoutes.length} APIs
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {area.signals.slice(0, 3).map((signal) => (
                <span
                  key={signal}
                  className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] opacity-85"
                >
                  {signal}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] opacity-70">
              Actions: {area.actions.slice(0, 3).join(', ')}
              {area.actions.length > 3 ? '...' : ''}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
