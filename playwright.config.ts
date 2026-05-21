import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function loadRootEnv() {
  for (const fileName of ['.env.local', '.env.test', '.env']) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) continue;

    const contents = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

loadRootEnv();

const smokePorts = {
  web: Number(process.env.SMOKE_WEB_PORT ?? 3100),
  chef: Number(process.env.SMOKE_CHEF_PORT ?? 3101),
  ops: Number(process.env.SMOKE_OPS_PORT ?? 3102),
  driver: Number(process.env.SMOKE_DRIVER_PORT ?? 3103),
};

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true' && !process.env.CI;
type SmokeApp = keyof typeof smokePorts;

const projectAppMap: Record<string, SmokeApp> = {
  'web-smoke': 'web',
  'chef-admin-smoke': 'chef',
  'ops-admin-smoke': 'ops',
  'driver-app-smoke': 'driver',
};

function selectedSmokeApps(): Set<SmokeApp> | null {
  const requestedApp = process.env.SMOKE_APP;
  if (requestedApp) {
    if (requestedApp in smokePorts) return new Set([requestedApp as SmokeApp]);
    throw new Error(`Unsupported SMOKE_APP value: ${requestedApp}`);
  }

  const selected = new Set<SmokeApp>();
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    const inlineProject = arg.match(/^--project=(.+)$/)?.[1];
    const nextProject = arg === '--project' ? process.argv[index + 1] : undefined;
    const projectName = inlineProject ?? nextProject;
    if (projectName && projectName in projectAppMap) {
      selected.add(projectAppMap[projectName]);
    }
  }

  return selected.size > 0 ? selected : null;
}

const selectedApps = selectedSmokeApps();

const webServerEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) webServerEnv[key] = value;
}
webServerEnv.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--max-old-space-size=4096']
  .filter(Boolean)
  .join(' ');

function localUrl(port: number) {
  return `http://127.0.0.1:${port}`;
}

const webServers = [
  {
    app: 'web' as const,
    command: `pnpm --filter @ridendine/web exec next dev -p ${smokePorts.web}`,
    url: localUrl(smokePorts.web),
    reuseExistingServer,
    env: webServerEnv,
    timeout: 120_000,
  },
  {
    app: 'chef' as const,
    command: `pnpm --filter @ridendine/chef-admin exec next dev -p ${smokePorts.chef}`,
    url: localUrl(smokePorts.chef),
    reuseExistingServer,
    env: webServerEnv,
    timeout: 120_000,
  },
  {
    app: 'ops' as const,
    command: `pnpm --filter @ridendine/ops-admin exec next dev -p ${smokePorts.ops}`,
    url: localUrl(smokePorts.ops),
    reuseExistingServer,
    env: webServerEnv,
    timeout: 120_000,
  },
  {
    app: 'driver' as const,
    command: `pnpm --filter @ridendine/driver-app exec next dev -p ${smokePorts.driver}`,
    url: localUrl(smokePorts.driver),
    reuseExistingServer,
    env: webServerEnv,
    timeout: 120_000,
  },
].filter((server) => !selectedApps || selectedApps.has(server.app))
  .map(({ app: _app, ...server }) => server);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.SMOKE_APP ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'web-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: localUrl(smokePorts.web),
      },
    },
    {
      name: 'chef-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: localUrl(smokePorts.chef),
      },
    },
    {
      name: 'ops-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: localUrl(smokePorts.ops),
      },
    },
    {
      name: 'driver-app-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: localUrl(smokePorts.driver),
      },
    },
  ],
  webServer: webServers,
});
