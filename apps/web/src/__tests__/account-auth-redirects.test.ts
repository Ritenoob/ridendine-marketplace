/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('account auth redirects', () => {
  it.each([
    'app/account/page.tsx',
    'app/account/favorites/page.tsx',
    'app/account/settings/page.tsx',
  ])('%s redirects after auth loading instead of during render', (relativePath) => {
    const src = read(relativePath);

    expect(src).toContain('useEffect');
    expect(src).toContain('!loading && !user');
    expect(src).toContain("router.replace('/auth/login')");
    expect(src).not.toContain("router.push('/auth/login')");
  });
});
