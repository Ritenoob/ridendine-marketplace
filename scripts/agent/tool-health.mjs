#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const checks = [
  { name: 'node', command: 'node', args: ['--version'], required: true },
  { name: 'pnpm', command: 'pnpm', args: ['--version'], required: true },
  { name: 'playwright-package', command: 'node', args: ['-e', "const { chromium } = require('@playwright/test'); console.log(typeof chromium.launch)"], required: true },
  { name: 'playwright-browser', command: 'node', args: ['-e', "const { chromium } = require('@playwright/test'); (async()=>{ const b=await chromium.launch({headless:true}); await b.close(); console.log('launch-ok'); })().catch(e=>{ console.error(e.message); process.exit(1); })"], required: true, timeout: 20_000 },
  { name: 'supabase-cli', command: 'pnpm', args: ['dlx', 'supabase', '--version'], required: false, timeout: 30_000 },
  { name: 'playwright-cli', command: 'playwright-cli', args: ['--version'], required: false },
  { name: 'agent-browser', command: 'agent-browser', args: ['--help'], required: false },
  { name: 'impeccable', command: 'impeccable', args: ['--help'], required: false },
  { name: 'semble-help', command: 'semble', args: ['--help'], required: false },
  { name: 'semble-search', command: 'semble', args: ['search', 'package scripts', './', '--top-k', '1'], required: false, timeout: 30_000 },
];

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    encoding: 'utf8',
    timeout: check.timeout || 10_000,
  });

  return {
    name: check.name,
    required: check.required,
    command: [check.command, ...check.args].join(' '),
    status: result.status,
    signal: result.signal,
    ok: result.status === 0,
    stdout: String(result.stdout || '').trim().slice(0, 2_000),
    stderr: String(result.stderr || '').trim().slice(0, 2_000),
    error: result.error?.message,
  };
}

function toMarkdown(report) {
  const lines = [
    `# Agent Tool Health - ${report.generatedAt}`,
    '',
    '| Tool | Required | Result | Evidence |',
    '| --- | --- | --- | --- |',
  ];

  for (const check of report.checks) {
    const evidence = check.ok ? check.stdout || 'ok' : check.stderr || check.error || `exit ${check.status}`;
    lines.push(`| ${check.name} | ${check.required ? 'yes' : 'no'} | ${check.ok ? 'ok' : 'failed'} | ${evidence.replace(/\s+/g, ' ').replaceAll('|', '\\|').slice(0, 240)} |`);
  }

  lines.push('', '## Notes', '');
  lines.push('- Required failures block live agent verification.');
  lines.push('- Optional failures should be recorded in reports with the fallback used.');
  lines.push('- `playwright-package` is preferred over `playwright-cli` on machines where system Chrome is absent.');
  return lines.join('\n');
}

const outDir = '.codex-artifacts';
fs.mkdirSync(outDir, { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  checks: checks.map(runCheck),
};

const jsonPath = path.join(outDir, 'agent-tool-health.json');
const markdownPath = path.join(outDir, 'agent-tool-health.md');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(markdownPath, toMarkdown(report));

const requiredFailures = report.checks.filter((check) => check.required && !check.ok);
console.log(JSON.stringify({ ok: requiredFailures.length === 0, requiredFailures, jsonPath, markdownPath }, null, 2));
if (requiredFailures.length > 0) process.exitCode = 1;
