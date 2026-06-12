#!/usr/bin/env node
/**
 * Seed UUID guard.
 *
 * Statically validates supabase/seeds/seed.sql so CI's
 * `psql -v ON_ERROR_STOP=1` never trips over a non-UUID id literal:
 *
 *   1. Parses every `INSERT INTO <table> (cols...) VALUES (...), (...)`
 *      statement (comment-, string-, ARRAY[]- and function-call-aware).
 *   2. For every value bound to an `id` / `*_id` column, asserts the literal
 *      is a valid UUID (8-4-4-4-12 hex) or NULL.
 *   3. Asserts every `*_id` reference value also appears as a primary key
 *      (`id` column) somewhere else in the file, or is a known external id.
 *   4. Safety net: flags any quoted literal anywhere in the file that still
 *      looks like one of the legacy fake-id prefixes (kit-, ord-, osh-, ...)
 *      or like a malformed 5-segment UUID attempt.
 *
 * Usage: node scripts/e2e/validate-seed-uuids.mjs   (pnpm e2e:validate-seed)
 * Exits non-zero with a report on any violation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const seedPath = path.join(root, 'supabase', 'seeds', 'seed.sql');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_PREFIX_RE = /^(kit|cat|item|cust|addr|drv|veh|ord|oi|osh|del|rev)-/i;

/** Ids that may be referenced without being inserted as a PK in this file. */
const KNOWN_EXTERNAL_IDS = new Set([
  // (none today — auth.users rows are seeded in the same file)
]);

if (!fs.existsSync(seedPath)) {
  console.error(`Missing seed file: ${seedPath}`);
  process.exit(1);
}

const rawSql = fs.readFileSync(seedPath, 'utf8');

/** Strip `--` line comments (single-quoted strings never span lines here). */
function stripComments(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "'") inString = !inString;
        else if (!inString && ch === '-' && line[i + 1] === '-') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

const sql = stripComments(rawSql);

/**
 * Parse the VALUES region of one INSERT, starting at `start` (index just
 * after the VALUES keyword). Returns { tuples: string[][], end }.
 * Stops at top-level `ON CONFLICT` or the statement-terminating `;`.
 */
function parseValues(text, start) {
  const tuples = [];
  let i = start;
  let depth = 0;
  let bracketDepth = 0;
  let inString = false;
  let current = null; // values of the tuple being built
  let valueStart = -1;

  const pushValue = (endIdx) => {
    current.push(text.slice(valueStart, endIdx).trim());
  };

  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === "'") {
        if (text[i + 1] === "'") {
          i += 2; // escaped quote
          continue;
        }
        inString = false;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inString = true;
      i++;
      continue;
    }
    if (depth === 0) {
      if (ch === ';') return { tuples, end: i };
      if (/^ON\s+CONFLICT/i.test(text.slice(i, i + 20))) {
        const semi = text.indexOf(';', i);
        return { tuples, end: semi === -1 ? text.length : semi };
      }
      if (ch === '(') {
        depth = 1;
        current = [];
        valueStart = i + 1;
      }
      i++;
      continue;
    }
    // depth >= 1
    if (ch === '(') depth++;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        pushValue(i);
        tuples.push(current);
        current = null;
      }
    } else if (ch === ',' && depth === 1 && bracketDepth === 0) {
      pushValue(i);
      valueStart = i + 1;
    }
    i++;
  }
  return { tuples, end: i };
}

const insertRe = /INSERT\s+INTO\s+([\w."]+)\s*\(([^)]*)\)\s*VALUES/gi;

const errors = [];
const warnings = [];
const pkOwner = new Map(); // pk value -> table
const refs = []; // { table, column, value }
const perTable = new Map(); // table -> { rows, idValuesChecked }

let match;
while ((match = insertRe.exec(sql)) !== null) {
  const table = match[1].replace(/"/g, '');
  const columns = match[2].split(',').map((c) => c.trim().replace(/"/g, ''));
  const idCols = columns
    .map((name, idx) => ({ name, idx }))
    .filter(({ name }) => name === 'id' || name.endsWith('_id'));

  const { tuples } = parseValues(sql, insertRe.lastIndex);
  const stats = perTable.get(table) ?? { rows: 0, idValuesChecked: 0 };

  for (const tuple of tuples) {
    stats.rows++;
    if (tuple.length !== columns.length) {
      errors.push(
        `${table}: row has ${tuple.length} values but ${columns.length} columns ` +
          `(first value: ${tuple[0]?.slice(0, 60) ?? '<empty>'})`
      );
      continue;
    }
    for (const { name, idx } of idCols) {
      const raw = tuple[idx];
      if (/^NULL$/i.test(raw)) continue;
      const m = /^'((?:[^']|'')*)'$/.exec(raw);
      if (!m) {
        // Function call (e.g. gen_random_uuid()) — nothing static to check.
        warnings.push(`${table}.${name}: non-literal value "${raw.slice(0, 40)}" (skipped)`);
        continue;
      }
      const value = m[1].replace(/''/g, "'");
      stats.idValuesChecked++;
      if (!UUID_RE.test(value)) {
        errors.push(`${table}.${name}: '${value}' is NOT a valid UUID`);
        continue;
      }
      if (name === 'id') {
        if (pkOwner.has(value) && pkOwner.get(value) !== table) {
          warnings.push(
            `duplicate PK value '${value}' in ${table} (also in ${pkOwner.get(value)})`
          );
        }
        pkOwner.set(value, table);
      } else {
        refs.push({ table, column: name, value });
      }
    }
  }
  perTable.set(table, stats);
}

// Referential integrity: every *_id must resolve to a seeded PK or known external id.
let resolvedRefs = 0;
for (const { table, column, value } of refs) {
  if (pkOwner.has(value) || KNOWN_EXTERNAL_IDS.has(value)) {
    resolvedRefs++;
  } else {
    errors.push(`${table}.${column}: reference '${value}' has no matching PK in the seed`);
  }
}

// Safety net: any quoted literal anywhere that still looks like a legacy fake
// id or a malformed 5-segment UUID attempt.
const literalRe = /'((?:[^'\n]|'')*)'/g;
let lit;
const flaggedLiterals = new Set();
while ((lit = literalRe.exec(sql)) !== null) {
  const value = lit[1].replace(/''/g, "'");
  if (!/^[0-9a-z-]{8,40}$/i.test(value) || !value.includes('-')) continue;
  if (UUID_RE.test(value)) continue;
  const dashGroups = value.split('-').length;
  if (LEGACY_PREFIX_RE.test(value) || dashGroups === 5) {
    if (!flaggedLiterals.has(value)) {
      flaggedLiterals.add(value);
      errors.push(`legacy/malformed id-like literal still present: '${value}'`);
    }
  }
  // Anything else (e.g. slugs like 'every-bite-yum') is legitimate non-id text.
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`Seed UUID validation: ${path.relative(root, seedPath)}`);
console.log('');
console.log('Per-table id literals checked:');
for (const [table, stats] of perTable) {
  console.log(`  ${table.padEnd(24)} rows=${String(stats.rows).padStart(3)}  id-values=${stats.idValuesChecked}`);
}
console.log('');
console.log(`Primary keys collected: ${pkOwner.size}`);
console.log(`Foreign-key style references resolved: ${resolvedRefs}/${refs.length}`);

if (warnings.length > 0) {
  console.log('');
  console.log('Warnings:');
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length > 0) {
  console.error('');
  console.error(`FAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('');
console.log('OK — every id literal is a valid UUID and every *_id reference resolves.');
