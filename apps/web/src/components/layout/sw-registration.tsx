'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on app load.
 * Renders nothing — side-effect only.
 */
export function SwRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[SW] Registration failed:', err));
  }, []);

  return null;
}
