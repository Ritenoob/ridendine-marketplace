import { Card } from '@ridendine/ui';
import { cookies } from 'next/headers';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

type HealthCheck = {
  ready: boolean;
  count?: number;
  error?: string | null;
};

type EngineComponentHealth = {
  status: 'healthy' | 'degraded' | 'down';
  timestamp?: string;
  details?: Record<string, unknown>;
};

type EngineHealth = {
  overall?: EngineComponentHealth;
  components?: Record<string, EngineComponentHealth>;
  readiness?: {
    processorRuns?: Record<string, { lastSuccessAt: string | null }>;
  };
};

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3002'
  );
}

async function loadHealth() {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
  return response.json() as Promise<{
    readiness?: string;
    checks?: Record<string, HealthCheck>;
  }>;
}

async function loadEngineHealth() {
  const baseUrl = getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${baseUrl}/api/engine/health`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Engine health API returned ${response.status}`);
  }

  return response.json() as Promise<EngineHealth>;
}

function titleize(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatTimestamp(value: string | null | undefined, fallback = 'No timestamp recorded') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export default async function HealthPage() {
  let health: Awaited<ReturnType<typeof loadHealth>>;
  let engineHealth: EngineHealth | null = null;
  let engineHealthError: string | null = null;

  try {
    health = await loadHealth();
  } catch (error) {
    health = {
      readiness: 'not_ready',
      checks: {
        healthApi: {
          ready: false,
          error: error instanceof Error ? error.message : 'Health API failed',
        },
      },
    };
  }

  try {
    engineHealth = await loadEngineHealth();
  } catch (error) {
    engineHealthError = error instanceof Error ? error.message : 'Engine health API failed';
  }

  const checks = Object.entries(health.checks ?? {});
  const engineComponents = Object.entries(engineHealth?.components ?? {});
  const processorRuns = Object.entries(engineHealth?.readiness?.processorRuns ?? {});

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Ops Health</h1>
          <p className="mt-1 text-textMuted">
            Live readiness for the dashboard, Supabase tables, seed data, driver presence, and business engine dependencies.
          </p>
        </div>

        <Card className="border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-textMuted">Readiness</p>
              <p className="mt-1 text-2xl font-semibold text-white">{health.readiness ?? 'unknown'}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                health.readiness === 'ready'
                  ? 'bg-success/20 text-success'
                  : 'bg-danger/20 text-danger'
              }`}
            >
              {health.readiness === 'ready' ? 'Operational' : 'Needs attention'}
            </span>
          </div>
        </Card>

        <div>
          <h2 className="text-xl font-semibold text-white">Business Engine</h2>
          <p className="mt-1 text-sm text-textMuted">
            Protected readiness for database, engine, dispatch, payment, and scheduled processors.
          </p>
        </div>

        {engineHealthError ? (
          <Card className="border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Engine health</p>
                <p className="mt-1 text-sm text-textMuted">Protected health API</p>
              </div>
              <span className="rounded-full bg-danger/20 px-2 py-1 text-xs text-danger">Error</span>
            </div>
            <p className="mt-3 text-sm text-danger">{engineHealthError}</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Overall</p>
                  <p className="mt-1 text-sm text-textMuted">
                    {formatTimestamp(engineHealth?.overall?.timestamp)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    engineHealth?.overall?.status === 'healthy'
                      ? 'bg-success/20 text-success'
                      : engineHealth?.overall?.status === 'degraded'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-danger/20 text-danger'
                  }`}
                >
                  {engineHealth?.overall?.status ?? 'unknown'}
                </span>
              </div>
            </Card>

            {engineComponents.map(([name, component]) => (
              <Card key={name} className="border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{titleize(name)}</p>
                    <p className="mt-1 text-sm text-textMuted">{formatTimestamp(component.timestamp)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      component.status === 'healthy'
                        ? 'bg-success/20 text-success'
                        : component.status === 'degraded'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-danger/20 text-danger'
                    }`}
                  >
                    {component.status}
                  </span>
                </div>
                {Object.entries(component.details ?? {}).length > 0 && (
                  <dl className="mt-4 space-y-2 text-sm">
                    {Object.entries(component.details ?? {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3">
                        <dt className="text-textMuted">{titleize(key)}</dt>
                        <dd className="text-right text-white">{formatDetailValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Card>
            ))}
          </div>
        )}

        {processorRuns.length > 0 && (
          <>
            <div>
              <h2 className="text-xl font-semibold text-white">Processor Freshness</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {processorRuns.map(([name, run]) => (
                <Card key={name} className="border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{titleize(name)}</p>
                      <p className="mt-1 text-sm text-textMuted">
                        {formatTimestamp(run.lastSuccessAt, 'No successful run recorded')}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        run.lastSuccessAt
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {run.lastSuccessAt ? 'Seen' : 'Missing'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checks.map(([name, check]) => (
            <Card key={name} className="border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{titleize(name)}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    {typeof check.count === 'number' ? `${check.count} records` : 'Connectivity check'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    check.ready
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {check.ready ? 'Ready' : 'Error'}
                </span>
              </div>
              {check.error && <p className="mt-3 text-sm text-danger">{check.error}</p>}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
