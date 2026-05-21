#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';

const smokeTargets = [
  { app: 'web', project: 'web-smoke' },
  { app: 'chef', project: 'chef-admin-smoke' },
  { app: 'ops', project: 'ops-admin-smoke' },
  { app: 'driver', project: 'driver-app-smoke' },
];

const isWindows = platform() === 'win32';
const packageManagerCli = process.env.npm_execpath;
const pnpmBin = packageManagerCli ? process.execPath : isWindows ? 'pnpm.cmd' : 'pnpm';
const pnpmBaseArgs = packageManagerCli ? [packageManagerCli] : [];
const passthroughArgs = process.argv.slice(2);

for (const target of smokeTargets) {
  const args = [
    ...pnpmBaseArgs,
    'exec',
    'playwright',
    'test',
    '--grep',
    '@smoke',
    `--project=${target.project}`,
    '--workers=1',
    ...passthroughArgs,
  ];

  const result = spawnSync(pnpmBin, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SMOKE_APP: target.app,
    },
    shell: !packageManagerCli && isWindows,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
