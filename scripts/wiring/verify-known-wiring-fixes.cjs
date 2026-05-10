const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(relativeDir, acc = []) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) continue;
    const child = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(child)) acc.push(child);
  }
  return acc;
}

const checks = [
  {
    name: 'runtime Supabase queries use canonical drivers table',
    pass: () => {
      const files = [...walk('apps'), ...walk('packages')];
      return files.every((file) => !read(file).includes(".from('driver_profiles')"));
    },
  },
  {
    name: 'chef legal and password reset routes exist',
    pass: () =>
      exists('apps/chef-admin/src/app/privacy/page.tsx') &&
      exists('apps/chef-admin/src/app/terms/page.tsx') &&
      exists('apps/chef-admin/src/app/auth/forgot-password/page.tsx'),
  },
  {
    name: 'driver legal routes exist',
    pass: () =>
      exists('apps/driver-app/src/app/privacy/page.tsx') &&
      exists('apps/driver-app/src/app/terms/page.tsx'),
  },
  {
    name: 'chef storefront setup route exists',
    pass: () => exists('apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx'),
  },
  {
    name: 'driver upload API route exists',
    pass: () => exists('apps/driver-app/src/app/api/upload/route.ts'),
  },
  {
    name: 'chef public storefront links point at customer web',
    pass: () => {
      const source = read('apps/chef-admin/src/app/dashboard/page.tsx');
      return !source.includes('href={`/chefs/${storefront.slug}`}') &&
        source.includes('https://ridendine.ca/chefs/${storefront.slug}');
    },
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length) {
  console.error('Known wiring fix checks failed:');
  for (const failure of failures) console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log(`Known wiring fix checks passed: ${checks.length}/${checks.length}`);
