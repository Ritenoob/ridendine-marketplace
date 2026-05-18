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

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
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
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'chef-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3001',
      },
    },
    {
      name: 'ops-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3002',
      },
    },
    {
      name: 'driver-app-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3003',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ridendine/web dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/chef-admin dev',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/ops-admin dev',
      url: 'http://127.0.0.1:3002',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/driver-app dev',
      url: 'http://127.0.0.1:3003',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
