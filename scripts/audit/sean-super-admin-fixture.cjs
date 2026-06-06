const fs = require('fs');
const path = require('path');

const root = process.cwd();
const TEST_EMAIL = 'sean@ridendine.ca';
const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';

const sourceFiles = {
  localSeed: 'supabase/seeds/seed.sql',
  dedicatedSeed: 'scripts/seed-sean-super-admin.sql',
  bootstrap: 'scripts/bootstrap-super-admin.mjs',
};

function read(relativePath, repoRoot = root) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function normalized(text) {
  return text.replace(/\s+/g, ' ');
}

function evidence(file, pattern, description) {
  return { file, pattern, description };
}

const fixtureContracts = [
  {
    name: 'auth user promoted to super_admin',
    appSurface: 'All apps',
    evidence: [
      evidence(sourceFiles.localSeed, /'11111111-1111-1111-1111-111111111111', 'sean@ridendine\.ca'.*true, 'authenticated'/, 'local seed creates confirmed auth user with super-admin flag'),
      evidence(sourceFiles.dedicatedSeed, /is_super_admin\s*=\s*true/, 'dedicated seed promotes existing auth user to super admin'),
      evidence(sourceFiles.bootstrap, /app_metadata:\s*\{\s*role:\s*'super_admin'\s*\}/, 'bootstrap script sets auth app metadata role'),
    ],
  },
  {
    name: 'auth metadata role is super_admin',
    appSurface: 'All apps',
    evidence: [
      evidence(sourceFiles.localSeed, /"role":"super_admin"/, 'local seed stores super_admin metadata'),
      evidence(sourceFiles.dedicatedSeed, /"provider":"email","providers":\["email"\],"role":"super_admin".*"display_name":"Sean","role":"super_admin"/, 'dedicated seed stores app and user metadata roles'),
      evidence(sourceFiles.bootstrap, /user_metadata:\s*\{[^}]*role:\s*'super_admin'[^}]*\}/, 'bootstrap script sets user metadata role'),
    ],
  },
  {
    name: 'platform user is active super_admin',
    appSurface: 'Ops admin',
    evidence: [
      evidence(sourceFiles.localSeed, /'90000000-0000-0000-0000-000000000002'.*'sean@ridendine\.ca'.*'super_admin'.*true/, 'local seed creates active platform super-admin row'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO platform_users.*'sean@ridendine\.ca'.*'super_admin'.*true/, 'dedicated seed upserts active platform super-admin row'),
      evidence(sourceFiles.bootstrap, /admin\.from\('platform_users'\)\.upsert[\s\S]*role:\s*'super_admin'[\s\S]*is_active:\s*true/, 'bootstrap script upserts active platform super-admin row'),
    ],
  },
  {
    name: 'customer profile exists',
    appSurface: 'Customer marketplace',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO customers.*'11111111-2222-3333-aaaa-000000000001'.*'11111111-1111-1111-1111-111111111111'.*'sean@ridendine\.ca'/, 'local seed creates customer profile'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO customers.*'11111111-2222-3333-aaaa-000000000001'.*'11111111-1111-1111-1111-111111111111'.*'sean@ridendine\.ca'/, 'dedicated seed upserts customer profile'),
    ],
  },
  {
    name: 'customer default address exists',
    appSurface: 'Customer marketplace',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO customer_addresses.*'11111111-2222-3333-bbbb-000000000001'.*'11111111-2222-3333-aaaa-000000000001'.*true/, 'local seed creates default customer address'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO customer_addresses.*'11111111-2222-3333-bbbb-000000000001'.*'11111111-2222-3333-aaaa-000000000001'.*true/, 'dedicated seed creates default customer address'),
    ],
  },
  {
    name: 'chef profile is approved',
    appSurface: 'Chef admin',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO chef_profiles.*'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'.*'11111111-1111-1111-1111-111111111111'.*'approved'/, 'local seed creates approved chef profile'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO chef_profiles.*'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'.*'11111111-1111-1111-1111-111111111111'.*'approved'/, 'dedicated seed upserts approved chef profile'),
    ],
  },
  {
    name: 'chef storefront is active',
    appSurface: 'Chef admin',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO chef_storefronts[\s\S]*Every Bite Yum \(Sean\)[\s\S]*'dddddddd-dddd-dddd-dddd-dddddddddddd'[\s\S]*'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'[\s\S]*true,\s*true/, 'local seed creates active featured chef storefront'),
    ],
  },
  {
    name: 'driver profile is approved',
    appSurface: 'Driver app',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO drivers.*'11111111-2222-3333-cccc-000000000001'.*'11111111-1111-1111-1111-111111111111'.*'sean@ridendine\.ca'.*'approved'/, 'local seed creates approved driver profile'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO drivers.*'11111111-2222-3333-cccc-000000000001'.*'11111111-1111-1111-1111-111111111111'.*'sean@ridendine\.ca'.*'approved'/, 'dedicated seed upserts approved driver profile'),
    ],
  },
  {
    name: 'driver vehicle is active',
    appSurface: 'Driver app',
    evidence: [
      evidence(sourceFiles.localSeed, /INSERT INTO driver_vehicles.*'11111111-2222-3333-dddd-000000000001'.*'11111111-2222-3333-cccc-000000000001'.*true/, 'local seed creates active driver vehicle'),
      evidence(sourceFiles.dedicatedSeed, /INSERT INTO driver_vehicles.*'11111111-2222-3333-dddd-000000000001'.*'11111111-2222-3333-cccc-000000000001'.*true/, 'dedicated seed creates active driver vehicle'),
    ],
  },
  {
    name: 'bootstrap script promotes platform super_admin',
    appSurface: 'Ops admin',
    evidence: [
      evidence(sourceFiles.bootstrap, /updateUserById\(existing\.id, update\)/, 'bootstrap updates existing auth users'),
      evidence(sourceFiles.bootstrap, /createUser\(\{[\s\S]*email,[\s\S]*password,[\s\S]*email_confirm:\s*true/, 'bootstrap creates confirmed auth users when missing'),
      evidence(sourceFiles.bootstrap, /onConflict:\s*'user_id'/, 'bootstrap platform upsert is keyed by user_id'),
    ],
  },
];

function validateFixtureContracts(options = {}) {
  const repoRoot = options.root || root;
  const cache = new Map();
  const failures = [];

  function source(relativePath) {
    if (!cache.has(relativePath)) {
      cache.set(relativePath, normalized(read(relativePath, repoRoot)));
    }
    return cache.get(relativePath);
  }

  for (const contract of fixtureContracts) {
    for (const item of contract.evidence) {
      if (!item.pattern.test(source(item.file))) {
        failures.push({
          contract: contract.name,
          appSurface: contract.appSurface,
          file: item.file,
          description: item.description,
          pattern: String(item.pattern),
        });
      }
    }
  }

  const failedContracts = new Set(failures.map((failure) => failure.contract));
  return {
    account: TEST_EMAIL,
    userId: TEST_USER_ID,
    contracts: fixtureContracts,
    failures,
    passed: fixtureContracts.length - failedContracts.size,
    generatedAt: new Date().toISOString(),
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function generateMarkdown(result = validateFixtureContracts()) {
  const rows = result.contracts.map((contract) => {
    const failed = result.failures.some((failure) => failure.contract === contract.name);
    const evidenceSummary = contract.evidence
      .map((item) => `${item.description} (${item.file})`)
      .join('; ');
    return `| ${failed ? 'FAIL' : 'PASS'} | ${escapeCell(contract.appSurface)} | ${escapeCell(contract.name)} | ${escapeCell(evidenceSummary)} |`;
  });

  const failureRows = result.failures.length
    ? result.failures
        .map((failure) =>
          `| ${escapeCell(failure.contract)} | ${escapeCell(failure.appSurface)} | \`${escapeCell(failure.file)}\` | ${escapeCell(failure.description)} |`
        )
        .join('\n')
    : 'None found.';

  return `# Sean Super Admin Fixture

Generated: ${result.generatedAt}

This generated audit proves the seeded test account is documented as a full multi-app admin fixture in source control. It checks the local seed, the dedicated idempotent promotion seed, and the bootstrap script so the same account can exercise the Customer marketplace, Chef admin, Driver app, and Ops admin during verification.

## Summary

| Metric | Count |
|---|---:|
| Account | ${TEST_EMAIL} |
| User id | ${TEST_USER_ID} |
| Fixture contracts | ${result.contracts.length} |
| Passed contracts | ${result.passed} |
| Failed checks | ${result.failures.length} |

## Contract Matrix

| Status | App surface | Contract | Evidence |
|---|---|---|---|
${rows.join('\n')}

## Failures

${failureRows}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = root) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(result = validateFixtureContracts(), options = {}) {
  const repoRoot = options.root || root;
  const markdown = generateMarkdown(result);
  const outputs = [
    'docs/wiring/SEAN_SUPER_ADMIN_FIXTURE.md',
    'docs/architecture/codebase-map/wiring/SEAN_SUPER_ADMIN_FIXTURE.md',
    'docs/obsidian/codebase-map/Sean Super Admin Fixture.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

if (require.main === module) {
  const result = validateFixtureContracts();
  if (result.failures.length) {
    console.error('Sean super-admin fixture contract failures:');
    for (const failure of result.failures) {
      console.error(`- ${failure.contract}: ${failure.description} in ${failure.file}`);
    }
    process.exit(1);
  }

  writeDocs(result);
  console.log(`Sean super-admin fixture contracts passed: ${result.passed}/${fixtureContracts.length}`);
}

module.exports = {
  TEST_EMAIL,
  TEST_USER_ID,
  fixtureContracts,
  validateFixtureContracts,
  generateMarkdown,
  writeDocs,
};
