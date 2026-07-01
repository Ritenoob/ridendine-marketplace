/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RouteMap } from '@/components/map/route-map';

describe('RouteMap', () => {
  it('renders a stable delivery route summary without Leaflet runtime dependencies', () => {
    render(
      <RouteMap
        pickupLat={43.2557}
        pickupLng={-79.8711}
        pickupAddress="123 King St W"
        dropoffAddress="10 Main St W"
      />
    );

    expect(screen.getByTestId('route-map')).toBeInTheDocument();
    expect(screen.getByText('Pickup')).toBeInTheDocument();
    expect(screen.getByText('Dropoff')).toBeInTheDocument();
    expect(screen.getByText('123 King St W')).toBeInTheDocument();
    expect(screen.getByText('10 Main St W')).toBeInTheDocument();
    expect(screen.getAllByText('43.25570, -79.87110')).toHaveLength(2);
    expect(screen.getAllByText('Location pending')).toHaveLength(1);
  });
});
