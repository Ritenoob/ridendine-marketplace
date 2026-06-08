'use client';

import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { cn } from '@ridendine/ui';
import { DriverBottomNav } from './driver-bottom-nav';
import { DRIVER_NAV_ITEMS } from './driver-nav';
import { DriverSidebar } from './driver-sidebar';
import { DriverTopbar } from './driver-topbar';

type DriverStatusTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface DriverShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusTone?: DriverStatusTone;
  fullBleed?: boolean;
  showBottomNav?: boolean;
  contentClassName?: string;
}

export function DriverShell({
  children,
  title,
  subtitle,
  statusLabel,
  statusTone = 'neutral',
  fullBleed = false,
  showBottomNav = true,
  contentClassName,
}: DriverShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const userEmail = user?.email ?? null;
  const userLabel =
    user?.user_metadata?.display_name ||
    userEmail?.split('@')[0] ||
    'Driver';

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-text">
      <DriverSidebar items={DRIVER_NAV_ITEMS} pathname={pathname} />

      <div className="flex min-w-0 flex-1 flex-col">
        <DriverTopbar
          title={title}
          subtitle={subtitle}
          statusLabel={statusLabel}
          statusTone={statusTone}
          userLabel={userLabel}
          userEmail={userEmail}
          onSignOut={() => {
            void handleSignOut();
          }}
        />

        <main
          className={cn(
            'flex-1 bg-background',
            showBottomNav ? 'pb-20 md:pb-0' : 'pb-0',
          )}
        >
          <div
            className={cn(
              fullBleed
                ? 'w-full'
                : 'mx-auto w-full max-w-5xl px-4 py-4 md:px-8 md:py-6',
              contentClassName,
            )}
          >
            {children}
          </div>
        </main>

        {showBottomNav ? (
          <DriverBottomNav items={DRIVER_NAV_ITEMS} pathname={pathname} />
        ) : null}
      </div>
    </div>
  );
}
