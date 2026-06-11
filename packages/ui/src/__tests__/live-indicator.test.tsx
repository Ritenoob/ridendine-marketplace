// ==========================================
// LiveIndicator smoke tests
// Rendered with react-dom/server so no DOM environment is required.
// (Deeper interaction tests live in apps/driver-app/src/__tests__/.)
// ==========================================

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LiveIndicator } from '../components/live-indicator';
import { ridendineTokens } from '../tokens';

describe('LiveIndicator', () => {
  it('renders the connected state with the live token color and label', () => {
    const html = renderToStaticMarkup(<LiveIndicator status="connected" />);
    expect(html).toContain('data-testid="live-indicator"');
    expect(html).toContain('data-testid="live-indicator-dot"');
    expect(html).toContain('Live');
    expect(html).toContain(ridendineTokens.status.live.fg);
    // Connected dot pulses
    expect(html).toContain('animate-pulse');
  });

  it('renders the connecting state', () => {
    const html = renderToStaticMarkup(<LiveIndicator status="connecting" />);
    expect(html).toContain('Connecting…');
    expect(html).toContain(ridendineTokens.status.pending.fg);
    expect(html).not.toContain('animate-pulse');
  });

  it('renders the disconnected state', () => {
    const html = renderToStaticMarkup(<LiveIndicator status="disconnected" />);
    expect(html).toContain('Offline');
    expect(html).toContain(ridendineTokens.status.error.fg);
  });

  it('merges a custom className', () => {
    const html = renderToStaticMarkup(
      <LiveIndicator status="connected" className="custom-class" />
    );
    expect(html).toContain('custom-class');
  });
});
