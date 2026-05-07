import * as React from 'react';
import { cn } from '../utils';

export type LiveIndicatorStatus = 'connected' | 'connecting' | 'disconnected';

export interface LiveIndicatorProps {
  status: LiveIndicatorStatus;
  className?: string;
}

const STATUS_CONFIG = {
  connected: {
    dotClass: 'bg-green-500 animate-pulse',
    label: 'Live',
    textClass: 'text-green-700',
  },
  connecting: {
    dotClass: 'bg-yellow-400',
    label: 'Connecting...',
    textClass: 'text-yellow-700',
  },
  disconnected: {
    dotClass: 'bg-red-500',
    label: 'Offline',
    textClass: 'text-red-600',
  },
} as const;

export function LiveIndicator({ status, className }: LiveIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="live-indicator"
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      <span
        data-testid="live-indicator-dot"
        className={cn('h-2 w-2 rounded-full flex-shrink-0', config.dotClass)}
      />
      <span className={cn('text-xs font-medium', config.textClass)}>
        {config.label}
      </span>
    </span>
  );
}
