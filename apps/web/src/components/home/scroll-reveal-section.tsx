'use client';

import { useScrollReveal } from '@/hooks/use-scroll-reveal';

interface ScrollRevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollRevealSection({ children, className = '', delay = 0 }: ScrollRevealSectionProps) {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
