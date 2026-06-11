// ==========================================
// RIDENDINE UI COMPONENTS
// ==========================================

// Utilities
export { cn } from './utils';
export { ridendineTokens } from './tokens';
export type { RidendineTokens } from './tokens';

// Status display maps (single source of truth for status labels/badge classes)
export {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_BG_CLASSES,
  DELIVERY_STATUS_LABELS,
} from './status';

// Brand assets
export { Logo } from './assets/logo';
export type { LogoProps } from './assets/logo';

// Components
export * from './components/button';
export * from './components/input';
export * from './components/card';
export * from './components/badge';
export * from './components/spinner';
export * from './components/avatar';
export * from './components/empty-state';
export * from './components/error-state';
export * from './components/modal';
export { PasswordStrength } from './components/password-strength';
export { AuthLayout } from './components/auth-layout';
export { ErrorBoundary } from './components/error-boundary';
export * from './components/platform';
export { KpiTile } from './components/kpi-tile';
export { StatusBadge } from './components/status-badge';
export type { StatusVariant } from './components/status-badge';
export { DataTable } from './components/data-table';
export type { ColumnDef, DataTableProps } from './components/data-table';
export { PageHeader } from './components/page-header';
export { ToastProvider, useToast } from './components/toast';
export type { ToastOptions, ToastVariant } from './components/toast';
export { LiveIndicator } from './components/live-indicator';
export type { LiveIndicatorProps, LiveIndicatorStatus } from './components/live-indicator';

// NOTE: the MarketingShell / AppShell / MobileShell layout shells and
// AddressInput / GlobalError components were removed — no app ever adopted
// them (each app builds its own chrome in src/app/layout.tsx).
