#!/usr/bin/env node
/**
 * db-boundary ratchet
 *
 * The custom ESLint rule `db-boundary/no-raw-supabase-from`
 * (packages/config/eslint.config.js) flags raw supabase `.from('table')`
 * calls in app code that bypass the @ridendine/db repository layer. The rule
 * is a WARNING (not an error) because ~300 legacy call sites still exist, so
 * plain `pnpm lint` stays green and cannot stop NEW violations being added.
 *
 * This script is the ratchet: it counts the warnings per app and compares
 * them against the committed baseline (scripts/audit/db-boundary-baseline.json).
 *
 *   - count > baseline  -> exit 1 (a new raw `.from()` call was added)
 *   - count < baseline  -> pass, but print a note suggesting the baseline be
 *                          lowered (never auto-lowered)
 *   - count == baseline -> pass
 *
 * Usage:
 *   node scripts/audit/db-boundary-ratchet.mjs            # check (CI mode)
 *   node scripts/audit/db-boundary-ratchet.mjs --write-baseline
 *       # rewrite the baseline from current counts (use after intentionally
 *       # adding a raw call, or to ratchet DOWN after migrating call sites)
 *
 * Implementation notes:
 *   - Mirrors each app's own lint script ("eslint src --config
 *     ../../packages/config/eslint.config.js") but with --format json, run
 *     directly via the workspace-root eslint binary so it needs no pnpm/turbo
 *     on PATH.
 *   - ESLint exits 0 when there are only warnings, so the exit code of the
 *     lint run itself is not the signal; the JSON message counts are.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RULE_ID = 'db-boundary/no-raw-supabase-from';
const APPS = ['web', 'chef-admin', 'driver-app', 'ops-admin'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(__dirname, 'db-boundary-baseline.json');
const eslintBin = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

const writeBaseline = process.argv.includes('--write-baseline');

function countWarningsForApp(app) {
  const appDir = path.join(repoRoot, 'apps', app);
  // Same invocation as the app's own `lint` script, plus --format json.
  const result = spawnSync(
    process.execPath,
    [
      eslintBin,
      'src',
      '--config',
      path.join(repoRoot, 'packages', 'config', 'eslint.config.js'),
      '--format',
      'json',
    ],
    { cwd: appDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );

  // ESLint exit codes: 0 = clean or warnings only, 1 = lint errors found,
  // 2 = fatal (config/crash). Warnings-only is the expected steady state;
  // exit 1 still produces valid JSON. Only treat 2+ / missing JSON as fatal.
  if (result.error) {
    throw new Error(`Failed to spawn eslint for ${app}: ${result.error.message}`);
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `ESLint did not produce JSON output for apps/${app} (exit ${result.status}).\n` +
        `stderr:\n${result.stderr}`
    );
  }
  if (result.status !== null && result.status >= 2) {
    throw new Error(`ESLint crashed for apps/${app} (exit ${result.status}):\n${result.stderr}`);
  }

  let count = 0;
  for (const file of report) {
    for (const message of file.messages) {
      if (message.ruleId === RULE_ID) count += 1;
    }
  }
  return count;
}

function main() {
  console.log(`db-boundary ratchet: counting "${RULE_ID}" warnings per app...`);

  const counts = {};
  for (const app of APPS) {
    counts[app] = countWarningsForApp(app);
    console.log(`  apps/${app}: ${counts[app]}`);
  }

  if (writeBaseline) {
    writeFileSync(baselinePath, JSON.stringify(counts, null, 2) + '\n');
    console.log(`\nBaseline written to ${path.relative(repoRoot, baselinePath)}.`);
    return;
  }

  if (!existsSync(baselinePath)) {
    console.error(
      `\nBaseline file not found: ${baselinePath}\n` +
        'Run `node scripts/audit/db-boundary-ratchet.mjs --write-baseline` and commit it.'
    );
    process.exit(1);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  let failed = false;
  let improved = false;
  for (const app of APPS) {
    const current = counts[app];
    const allowed = baseline[app];
    if (typeof allowed !== 'number') {
      console.error(`  FAIL apps/${app}: no baseline entry — add "${app}" to db-boundary-baseline.json`);
      failed = true;
    } else if (current > allowed) {
      console.error(
        `  FAIL apps/${app}: ${current} warnings (baseline ${allowed}, +${current - allowed}) — ` +
          'new raw .from() call added — use a @ridendine/db repository or, ' +
          'if intentional, update the baseline (scripts/audit/db-boundary-baseline.json).'
      );
      failed = true;
    } else if (current < allowed) {
      console.log(
        `  NOTE apps/${app}: ${current} warnings (baseline ${allowed}, -${allowed - current}) — ` +
          'nice, fewer raw .from() calls! Consider lowering the baseline to lock in the gain.'
      );
      improved = true;
    } else {
      console.log(`  OK   apps/${app}: ${current} warnings (== baseline)`);
    }
  }

  if (failed) {
    console.error('\ndb-boundary ratchet FAILED.');
    process.exit(1);
  }
  if (improved) {
    console.log(
      '\ndb-boundary ratchet passed. Counts dropped below baseline — run\n' +
        '`node scripts/audit/db-boundary-ratchet.mjs --write-baseline` and commit\n' +
        'the result to ratchet the limit down (not done automatically).'
    );
  } else {
    console.log('\ndb-boundary ratchet passed.');
  }
}

main();
