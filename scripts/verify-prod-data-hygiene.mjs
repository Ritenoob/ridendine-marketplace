/**
 * Phase 13 (IRR-015) — fail if GitHub Actions workflows could run Supabase seed/reset.
 * Local dev still uses `pnpm db:seed` / `db:reset` from the shell; those must never appear in CI/CD YAML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const workflowsDir = path.join(root, '.github', 'workflows');

const patterns = [
  { re: /\bdb:seed\b/, label: 'pnpm/npm script db:seed' },
  { re: /supabase\s+db\s+seed\b/i, label: 'supabase db seed' },
  { re: /supabase\s+db\s+reset\b/i, label: 'supabase db reset' },
];

// A workflow may opt out ONLY for a runner-local Supabase stack: it must carry
// the explicit marker AND actually start a local stack in the same file
// (`supabase start` boots the Docker stack inside the runner — there is no
// linked-project credential in the workflow, so production is unreachable).
const LOCAL_STACK_MARKER = '# prod-data-hygiene: allow-local-supabase';

function isSanctionedLocalStackWorkflow(content) {
  return content.includes(LOCAL_STACK_MARKER) && /supabase\s+start\b/.test(content);
}

function main() {
  if (!fs.existsSync(workflowsDir)) {
    console.log('OK: no .github/workflows directory');
    return;
  }

  const files = fs.readdirSync(workflowsDir).filter((n) => n.endsWith('.yml') || n.endsWith('.yaml'));

  const violations = [];
  for (const name of files) {
    const full = path.join(workflowsDir, name);
    const content = fs.readFileSync(full, 'utf8');
    if (isSanctionedLocalStackWorkflow(content)) {
      console.log(`note: ${name} runs seed/reset against a runner-local Supabase stack (marker present) — allowed`);
      continue;
    }
    for (const { re, label } of patterns) {
      if (re.test(content)) {
        violations.push({ file: name, label });
      }
    }
  }

  if (violations.length > 0) {
    console.error('IRR-015 / Phase 13: forbidden patterns in workflows:');
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.label}`);
    }
    process.exit(1);
  }

  console.log('OK: workflows contain no db:seed / supabase db seed / supabase db reset');
}

main();
