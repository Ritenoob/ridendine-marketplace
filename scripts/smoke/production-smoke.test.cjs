const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const scriptPath = path.join(__dirname, 'production-smoke.ps1');

test('production smoke gates SkipHttpErrorCheck behind a compatibility wrapper', () => {
  const source = readFileSync(scriptPath, 'utf8');

  assert.match(source, /SupportsSkipHttpErrorCheck/);
  assert.match(source, /function Invoke-WebRequestCompat/);
  assert.doesNotMatch(source, /(?:^|\s)-SkipHttpErrorCheck\b/);
  assert.doesNotMatch(source, /^\s*SkipHttpErrorCheck\s*=/m);
});
