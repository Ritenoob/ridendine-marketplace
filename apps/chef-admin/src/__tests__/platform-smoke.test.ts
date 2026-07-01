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

  it('kitchen queue uses protected action payloads (live workflow surface)', () => {
    // Stage 1: the live accept/prep/ready workflow lives in Kitchen Command,
    // not the Orders ledger. Assert the protected action wiring on the kitchen
    // queue plus the shared module's action vocabulary.
    const src = read('components/kitchen/kitchen-order-queue.tsx');
    expect(src).toContain('KITCHEN_NEXT_TRANSITION');
    expect(src).toContain('KITCHEN_REJECT_TRANSITION');
    expect(KITCHEN_NEXT_TRANSITION.pending.action).toBe('accept');
    expect(KITCHEN_NEXT_TRANSITION.accepted.action).toBe('start_preparing');
    expect(KITCHEN_NEXT_TRANSITION.preparing.action).toBe('mark_ready');
    expect(KITCHEN_REJECT_TRANSITION.action).toBe('reject');
  });

  it('orders page is a read-only ledger with filters and detail links', () => {
    const ledger = read('components/orders/orders-ledger.tsx');
    // Ledger = history/search/trace, not a live workflow board.
    expect(ledger).toContain('Kitchen status');
    expect(ledger).toContain('Payment status');
    expect(ledger).toContain('Delivery status');
    expect(ledger).toContain('Export CSV');
    expect(ledger).toContain('/dashboard/orders/');
    // The ledger must NOT carry the live kitchen workflow.
    expect(ledger).not.toContain('Kitchen workflow');
    expect(ledger).not.toContain('KITCHEN_NEXT_TRANSITION');

    const page = read('app/dashboard/orders/page.tsx');
    expect(page).toContain('OrdersLedger');
    expect(page).toContain('Order Ledger');
    expect(page).toContain('Kitchen Command');
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

  it('inventory page is wired to the inventory APIs with a nav item', () => {
    const sidebar = read('components/layout/sidebar.tsx');
    expect(sidebar).toContain("href: '/dashboard/inventory'");
    expect(sidebar).toContain("label: 'Inventory'");

    const page = read('app/dashboard/inventory/page.tsx');
    expect(page).toContain('/api/inventory');
    expect(page).toContain('/api/inventory/alerts');
    // Real data only: an empty state, not fabricated rows.
    expect(page).toContain('EmptyState');

    const movement = read('components/inventory/stock-movement-modal.tsx');
    expect(movement).toContain('/api/inventory/waste');
    expect(movement).toContain('/movement');
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
