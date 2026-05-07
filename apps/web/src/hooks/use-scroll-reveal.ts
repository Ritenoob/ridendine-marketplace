'use client';

import { useEffect, useRef } from 'react';

/**
 * Attaches an Intersection Observer to the returned ref.
 * When the element enters the viewport, it receives the `data-visible` attribute
 * which CSS transitions react to via the `animate-on-scroll` utility class.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.setAttribute('data-visible', 'true');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
