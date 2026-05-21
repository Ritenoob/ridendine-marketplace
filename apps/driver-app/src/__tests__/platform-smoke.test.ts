/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('driver-app smoke wiring', () => {
  it('middleware preserves login/signup as public routes', () => {
    const src = read('middleware.ts');
    expect(src).toContain("'/auth/login'");
    expect(src).toContain("'/auth/signup'");
    expect(src).toContain("'/api/auth/login'");
    expect(src).toContain("'/api/auth/signup'");
    expect(src).toContain("loginRoute: '/auth/login'");
  });

  it('driver home page enforces auth redirect', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("redirect('/auth/login')");
  });

  it('critical driver pages exist for assignment lifecycle surfaces', () => {
    const deliveryPage = read('app/delivery/[id]/page.tsx');
    const historyPage = read('app/history/page.tsx');
    const earningsPage = read('app/earnings/page.tsx');
    expect(deliveryPage.length).toBeGreaterThan(100);
    expect(historyPage.length).toBeGreaterThan(100);
    expect(earningsPage.length).toBeGreaterThan(100);
  });

  it('dashboard hydrates presence from API and avoids fake hours', () => {
    const src = read('app/components/DriverDashboard.tsx');
    expect(src).toContain("fetch('/api/driver/presence')");
    expect(src).toContain('todayStats.hours === null');
    expect(src).toContain('Unable to update your online status right now');
  });

  it('delivery detail surfaces safe error messaging for action failures', () => {
    const src = read('app/delivery/[id]/components/DeliveryDetail.tsx');
    expect(src).toContain('setErrorMessage');
    expect(src).toContain('Failed to update delivery status');
    expect(src).toContain('Failed to complete delivery');
  });

  it('delivery detail safely renders assigned deliveries and database numeric values', () => {
    const src = read('app/delivery/[id]/components/DeliveryDetail.tsx');
    expect(src).toContain("'assigned'");
    expect(src).toContain("assigned: { label: 'Start Navigation to Pickup'");
    expect(src).toContain('formatCurrency(delivery.driver_payout)');
    expect(src).toContain('formatDistance(delivery.distance_km)');
    expect(src).toContain('formatCurrency(delivery.delivery_fee)');
    expect(src).toContain('formatCurrency(deliveryWithContact.driver_tip)');
    expect(src).not.toContain('delivery.driver_payout.toFixed');
    expect(src).not.toContain('delivery.delivery_fee.toFixed');
    expect(src).not.toContain('delivery.distance_km?.toFixed');
    expect(src).not.toContain('deliveryWithContact.driver_tip || 0).toFixed');
  });
});
