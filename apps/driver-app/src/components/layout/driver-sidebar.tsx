'use client';

import Link from 'next/link';
import { Logo, cn } from '@ridendine/ui';
import { isDriverNavActive, type DriverNavItem } from './driver-nav';

interface DriverSidebarProps {
  items: DriverNavItem[];
  pathname: string;
}

export function DriverSidebar({ items, pathname }: DriverSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Link
          href="/"
          className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="RideNDine Driver home"
        >
          <Logo height={28} />
        </Link>
        <span className="ml-auto rounded-full bg-primarySoft px-2 py-0.5 text-xs font-medium text-primary">
          Driver
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Driver primary">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-textSubtle">
          Operate
        </p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isDriverNavActive(pathname, item);
            const Icon = item.Icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primarySoft text-primary'
                      : 'text-textMuted hover:bg-surfaceMuted hover:text-text',
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md bg-surfaceMuted px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-textSubtle">
            Driver app
          </p>
          <p className="mt-1 text-xs text-textMuted">Desktop and PWA ready</p>
        </div>
      </div>
    </aside>
  );
}
