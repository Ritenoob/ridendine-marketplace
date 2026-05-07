/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

const mockRegister = jest.fn().mockResolvedValue({});

Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  value: { register: mockRegister },
});

import { SwRegistration } from '../../src/components/layout/sw-registration';

describe('SwRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing to the DOM', () => {
    const { container } = render(<SwRegistration />);
    expect(container.firstChild).toBeNull();
  });

  it('registers the service worker at /sw.js', async () => {
    render(<SwRegistration />);
    // Allow useEffect to run
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
  });

  it('calls register exactly once on mount', async () => {
    render(<SwRegistration />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });
});
