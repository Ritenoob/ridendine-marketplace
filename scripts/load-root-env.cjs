const fs = require('node:fs');
const path = require('node:path');

function loadRootEnv(startDir = process.cwd()) {
  const root = path.resolve(startDir, '..', '..');
  for (const fileName of ['.env.local', '.env.test', '.env']) {
    const filePath = path.join(root, fileName);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
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

module.exports = { loadRootEnv };
