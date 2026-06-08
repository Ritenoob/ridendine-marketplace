import type { LucideIcon } from 'lucide-react';
import {
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UserRound,
} from 'lucide-react';

export interface DriverNavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  Icon: LucideIcon;
}

export const DRIVER_NAV_ITEMS: DriverNavItem[] = [
  {
    href: '/',
    label: 'Work Dashboard',
    shortLabel: 'Work',
    description: 'Shift, readiness, offers, and active deliveries',
    Icon: LayoutDashboard,
  },
  {
    href: '/history',
    label: 'Delivery History',
    shortLabel: 'History',
    description: 'Completed deliveries and past route work',
    Icon: ClipboardList,
  },
  {
    href: '/earnings',
    label: 'Earnings',
    shortLabel: 'Earnings',
    description: 'Pay, tips, payouts, and ledger balance',
    Icon: CircleDollarSign,
  },
  {
    href: '/profile',
    label: 'Profile',
    shortLabel: 'Profile',
    description: 'Driver details, vehicle, and payout onboarding',
    Icon: UserRound,
  },
  {
    href: '/settings',
    label: 'Settings',
    shortLabel: 'Settings',
    description: 'Notifications and payout preferences',
    Icon: Settings,
  },
];

export function isDriverNavActive(pathname: string, item: DriverNavItem) {
  const cleanPath = pathname.split('?')[0]?.split('#')[0] || '/';

  if (item.href === '/') {
    return cleanPath === '/';
  }

  return cleanPath === item.href || cleanPath.startsWith(`${item.href}/`);
}
