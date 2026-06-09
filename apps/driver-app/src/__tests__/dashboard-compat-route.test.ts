/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

describe('driver dashboard compatibility route', () => {
  it('redirects legacy /dashboard links to the Driver home route', () => {
    const src = readFileSync(join(__dirname, '..', 'app/dashboard/page.tsx'), 'utf8');

    expect(src).toContain("redirect('/')");
  });
});
