/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveIndicator } from '@ridendine/ui';

describe('LiveIndicator', () => {
  it('shows "Live" text when status is connected', () => {
    render(<LiveIndicator status="connected" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders green dot when connected', () => {
    render(<LiveIndicator status="connected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot).toHaveClass('bg-green-500');
  });

  it('animates the dot with pulse when connected', () => {
    render(<LiveIndicator status="connected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot).toHaveClass('animate-pulse');
  });

  it('shows "Connecting..." text when status is connecting', () => {
    render(<LiveIndicator status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders yellow dot when connecting', () => {
    render(<LiveIndicator status="connecting" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot).toHaveClass('bg-yellow-400');
  });

  it('shows "Offline" text when status is disconnected', () => {
    render(<LiveIndicator status="disconnected" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders red dot when disconnected', () => {
    render(<LiveIndicator status="disconnected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot).toHaveClass('bg-red-500');
  });

  it('accepts className and applies it to the container', () => {
    render(<LiveIndicator status="connected" className="custom-class" />);
    const container = screen.getByTestId('live-indicator');
    expect(container).toHaveClass('custom-class');
  });
});
