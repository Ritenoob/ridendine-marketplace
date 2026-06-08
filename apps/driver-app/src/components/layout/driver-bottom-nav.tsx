'use client';

import Link from 'next/link';
import { cn } from '@ridendine/ui';
import { isDriverNavActive, type DriverNavItem } from './driver-nav';

interface DriverBottomNavProps {
  items: DriverNavItem[];
  pathname: string;
}

export function DriverBottomNav({ items, pathname }: DriverBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface shadow-lg safe-bottom md:hidden"
      aria-label="Driver primary"
    >
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const active = isDriverNavActive(pathname, item);
          const Icon = item.Icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors',
                active ? 'text-primary' : 'text-textMuted hover:text-text',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate text-[11px] font-medium">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
