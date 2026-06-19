/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { KITCHEN_NEXT_TRANSITION, KITCHEN_REJECT_TRANSITION } from '@ridendine/utils';

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
    // Business Snapshot: week-over-week and net earnings
    expect(src).toContain('weekRevenue');
    expect(src).toContain('prevWeekRevenue');
    expect(src).toContain('Est. net earnings');
  });

  it('orders list uses protected action payloads and empty state', () => {
    const src = read('components/orders/orders-list.tsx');
    // The protected action payloads now come from the shared kitchen
    // workflow in @ridendine/utils; assert the wiring plus the shared
    // module's action vocabulary.
    expect(src).toContain('KITCHEN_NEXT_TRANSITION');
    expect(src).toContain('KITCHEN_REJECT_TRANSITION');
    expect(KITCHEN_NEXT_TRANSITION.pending.action).toBe('accept');
    expect(KITCHEN_NEXT_TRANSITION.accepted.action).toBe('start_preparing');
    expect(KITCHEN_NEXT_TRANSITION.preparing.action).toBe('mark_ready');
    expect(KITCHEN_REJECT_TRANSITION.action).toBe('reject');
    expect(src).toContain('Kitchen workflow');
    expect(src).toContain('Kitchen step');
    expect(src).toContain('Next action');
    expect(src).toContain('Ready for pickup');
    expect(src).toContain('No ');
    expect(src).toContain('orders');
  });

  it('sidebar includes business engine nav items', () => {
    const src = read('components/layout/sidebar.tsx');
    expect(src).toContain("href: '/dashboard/customers'");
    expect(src).toContain("label: 'Customers'");
    expect(src).toContain("href: '/dashboard/growth'");
    expect(src).toContain("label: 'Growth'");
  });

  it('business engine pages exist', () => {
    const customers = read('app/dashboard/customers/page.tsx');
    const growth = read('app/dashboard/growth/page.tsx');
    expect(customers).toContain('Customer List');
    expect(customers).toContain('Understanding Your Customer Tiers');
    expect(growth).toContain('Business Growth');
    expect(growth).toContain('Revenue Trend');
  });

  it('sidebar includes kitchen command nav item', () => {
    const src = read('components/layout/sidebar.tsx');
    expect(src).toContain("href: '/dashboard/kitchen'");
    expect(src).toContain("label: 'Kitchen'");
  });

  it('kitchen command page exists with all three sections and pause wiring', () => {
    const page = read('app/dashboard/kitchen/page.tsx');
    expect(page).toContain('Kitchen Command');
    expect(page).toContain("Today's Prep Plan");
    expect(page).toContain('Live Prep Board');
    expect(page).toContain('/api/kitchen/overview');
    expect(page).toContain('/api/kitchen/pause');
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
