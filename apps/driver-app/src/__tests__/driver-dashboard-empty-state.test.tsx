/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import DriverDashboard from '../app/components/DriverDashboard';

// Minimal driver fixture
const mockDriver = {
  id: 'driver-1',
  first_name: 'Jane',
  last_name: 'Doe',
  user_id: 'user-1',
  status: 'active' as const,
  email: 'jane@example.com',
  phone: '555-0100',
  vehicle_make: 'Toyota',
  vehicle_model: 'Corolla',
  vehicle_year: 2020,
  vehicle_color: 'white',
  vehicle_plate: 'ABC 123',
  license_number: 'DL123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock next/link and next/image so they render in jsdom
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('next/image', () => {
  const Img = ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />;
  Img.displayName = 'Image';
  return Img;
});

// Mock next/navigation since DriverDashboard now uses useRouter for sign-out.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// Mock @ridendine/auth since DriverDashboard now uses useAuthContext for sign-out.
jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => ({ user: null, signOut: jest.fn().mockResolvedValue(undefined) }),
}));

// Mock OfferAlert so it doesn't make real network calls
jest.mock('@/components/offer-alert', () => ({
  OfferAlert: () => null,
}));

// Mock fetch so presence/earnings hydration doesn't error
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({}),
  }) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('DriverDashboard — no active deliveries empty state', () => {
  it('renders "No active deliveries" heading when activeDeliveries is empty', () => {
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);
    expect(screen.getByText('No active deliveries')).toBeInTheDocument();
  });

  it('renders subtitle pointing to delivery offers', () => {
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);
    expect(
      screen.getByText(/new delivery offers will appear here/i)
    ).toBeInTheDocument();
  });

  it('does NOT render "No active deliveries" when a delivery is present', () => {
    const delivery = {
      id: 'del-1',
      pickup_address: '1 King St W',
      dropoff_address: '100 Queen St E',
      distance_km: 3.2,
      driver_payout: '8.50',
      status: 'assigned' as const,
    };
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);
    expect(screen.queryByText('No active deliveries')).not.toBeInTheDocument();
  });
});
