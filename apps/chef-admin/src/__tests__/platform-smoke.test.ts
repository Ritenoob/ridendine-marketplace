/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('chef-admin smoke wiring', () => {
  it('home page redirects to dashboard', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("redirect('/dashboard')");
  });

  it('middleware preserves auth route/public-route protections', () => {
    const src = read('middleware.ts');
    expect(src).toContain('/auth/login');
    expect(src).toContain('/auth/signup');
    expect(src).toContain('/auth/forgot-password');
    expect(src).toContain('/privacy');
    expect(src).toContain('/terms');
    expect(src).toContain('/api/health');
    expect(src).toContain("loginRoute: '/auth/login'");
  });

  it('login form posts to the chef auth API instead of browser-only auth', () => {
    const src = read('app/auth/login/page.tsx');
    expect(src).toContain("fetch('/api/auth/login'");
    expect(src).not.toContain('useAuth');
  });

  it('critical dashboard pages exist', () => {
    const dashboardOrders = read('app/dashboard/orders/page.tsx');
    const dashboardMenu = read('app/dashboard/menu/page.tsx');
    const dashboardAvailability = read('app/dashboard/availability/page.tsx');
    expect(dashboardOrders.length).toBeGreaterThan(100);
    expect(dashboardMenu.length).toBeGreaterThan(100);
    expect(dashboardAvailability.length).toBeGreaterThan(100);
  });

  it('dashboard exposes chef command center and readiness wiring', () => {
    const src = read('app/dashboard/page.tsx');
    expect(src).toContain('Chef operating dashboard');
    expect(src).toContain('Today&apos;s Action Queue');
    expect(src).toContain('Prep Timeline');
    expect(src).toContain('Menu Health');
    expect(src).toContain('Storefront Readiness');
    expect(src).toContain('Quick Tools');
    expect(src).toContain('Business Snapshot');
    expect(src).toContain('getMenuItemsByStorefront');
    expect(src).toContain('chef_availability');
  });

  it('orders list uses protected action payloads and empty state', () => {
    const src = read('components/orders/orders-list.tsx');
    expect(src).toContain("action: 'accept'");
    expect(src).toContain("action: 'start_preparing'");
    expect(src).toContain("action: 'mark_ready'");
    expect(src).toContain("action: 'reject'");
    expect(src).toContain('Kitchen workflow');
    expect(src).toContain('Kitchen step');
    expect(src).toContain('Next action');
    expect(src).toContain('Ready for pickup');
    expect(src).toContain('No ');
    expect(src).toContain('orders');
  });

  it('menu editor exposes inventory controls through the API', () => {
    const modal = read('components/menu/item-modal.tsx');
    const list = read('components/menu/menu-list.tsx');
    const createRoute = read('app/api/menu/route.ts');
    const updateRoute = read('app/api/menu/[id]/route.ts');

    expect(modal).toContain('Daily Limit');
    expect(modal).toContain('Sold Today');
    expect(modal).toContain('Restock At');
    expect(list).toContain('Sold Out');
    expect(createRoute).toContain('daily_limit');
    expect(updateRoute).toContain('sold_out_at');
  });
});
