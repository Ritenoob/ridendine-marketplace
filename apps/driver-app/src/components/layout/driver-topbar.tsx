'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Logo, cn } from '@ridendine/ui';

type DriverStatusTone = 'neutral' | 'success' | 'warning' | 'danger';

interface DriverTopbarProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusTone?: DriverStatusTone;
  userLabel: string;
  userEmail?: string | null;
  onSignOut: () => void;
}

const STATUS_CLASSES: Record<DriverStatusTone, string> = {
  neutral: 'bg-surfaceMuted text-textMuted',
  success: 'bg-successSoft text-success',
  warning: 'bg-warningSoft text-warning',
  danger: 'bg-dangerSoft text-danger',
};

export function DriverTopbar({
  title,
  subtitle,
  statusLabel,
  statusTone = 'neutral',
  userLabel,
  userEmail,
  onSignOut,
}: DriverTopbarProps) {
  return (
    <header className="sticky top-0 z-sticky flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 safe-top md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus md:hidden"
          aria-label="RideNDine Driver home"
        >
          <Logo height={28} variant="icon" />
        </Link>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-text md:text-lg">{title}</h1>
            {statusLabel ? (
              <span
                className={cn(
                  'hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex',
                  STATUS_CLASSES[statusTone],
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 hidden truncate text-xs text-textMuted sm:block">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="max-w-40 truncate text-sm font-medium text-text">{userLabel}</p>
          {userEmail ? <p className="max-w-40 truncate text-xs text-textMuted">{userEmail}</p> : null}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-textMuted transition-colors hover:border-danger/30 hover:bg-dangerSoft hover:text-danger focus-visible:outline-none focus-visible:shadow-focus"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
