const test = require('node:test');
const assert = require('node:assert/strict');

const REQUIRED_CONTRACTS = [
  'auth user promoted to super_admin',
  'auth metadata role is super_admin',
  'platform user is active super_admin',
  'customer profile exists',
  'chef profile is approved',
  'driver profile is approved',
  'driver vehicle is active',
  'bootstrap script promotes platform super_admin',
];

test('validates Sean multi-app super-admin fixture contracts', () => {
  const {
    fixtureContracts,
    validateFixtureContracts,
  } = require('./sean-super-admin-fixture.cjs');

  const result = validateFixtureContracts();
  assert.equal(result.failures.length, 0);
  assert.equal(result.passed, fixtureContracts.length);

  for (const name of REQUIRED_CONTRACTS) {
    assert.ok(
      fixtureContracts.some((contract) => contract.name === name),
      `missing contract: ${name}`
    );
  }
});

test('generates markdown with the seeded account and every app surface', () => {
  const { generateMarkdown } = require('./sean-super-admin-fixture.cjs');
  const markdown = generateMarkdown();

  assert.match(markdown, /sean@ridendine\.ca/);
  assert.match(markdown, /Customer marketplace/);
  assert.match(markdown, /Chef admin/);
  assert.match(markdown, /Driver app/);
  assert.match(markdown, /Ops admin/);
  assert.match(markdown, /super_admin/);
});
