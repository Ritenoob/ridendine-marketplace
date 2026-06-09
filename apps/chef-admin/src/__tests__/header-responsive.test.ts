/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function readHeader(): string {
  return readFileSync(join(__dirname, '..', 'components/layout/header.tsx'), 'utf8');
}

function readDashboardLayout(): string {
  return readFileSync(join(__dirname, '..', 'app/dashboard/layout.tsx'), 'utf8');
}

describe('Chef header responsive contract', () => {
  it('keeps the mobile header constrained within phone viewports', () => {
    const src = readHeader();

    expect(src).toContain('w-full min-w-0');
    expect(src).toContain('gap-2 sm:gap-4');
    expect(src).toContain('max-w-[calc(100vw-7rem)]');
    expect(src).toContain('variant="icon"');
  });

  it('allows the dashboard shell column to shrink on mobile', () => {
    const src = readDashboardLayout();

    expect(src).toContain('min-w-0 flex-1');
    expect(src).toContain('overflow-x-hidden');
  });
});
