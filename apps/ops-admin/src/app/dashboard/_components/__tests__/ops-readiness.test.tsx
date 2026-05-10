import React from 'react';
import { render, screen } from '@testing-library/react';
import { OpsReadiness, type OpsReadinessItem } from '../ops-readiness';

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('OpsReadiness', () => {
  const items: OpsReadinessItem[] = [
    { label: 'Auth', status: 'healthy', detail: 'Protected session active' },
    { label: 'Database', status: 'healthy', detail: 'Dashboard queries responding' },
    { label: 'Engine', status: 'degraded', detail: 'Pressure data unavailable', href: '/dashboard/settings' },
    { label: 'Realtime', status: 'healthy', detail: 'Live board mounted' },
    { label: 'Processors', status: 'healthy', detail: 'Cron routes configured' },
    { label: 'Finance', status: 'down', detail: 'Refund queue unavailable', href: '/dashboard/finance' },
  ];

  it('renders each readiness item with status and detail', () => {
    render(<OpsReadiness items={items} />);

    for (const item of items) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.getByText(item.detail)).toBeInTheDocument();
    }

    expect(screen.getAllByText('healthy')).toHaveLength(4);
    expect(screen.getByText('degraded')).toBeInTheDocument();
    expect(screen.getByText('down')).toBeInTheDocument();
  });

  it('links degraded or down items to their owner page', () => {
    render(<OpsReadiness items={items} />);

    expect(screen.getByRole('link', { name: /Engine/i })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.getByRole('link', { name: /Finance/i })).toHaveAttribute('href', '/dashboard/finance');
  });
});
