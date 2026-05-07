'use client';

import * as React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ── Variant styling ────────────────────────────────────────────────────────

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-[#E85D26] text-white toast-success',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

const variantIcons: Record<ToastVariant, React.ReactElement> = {
  success: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ── Single Toast item ──────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Give the fade-out animation time before removing
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        variantClasses[toast.variant],
      ].join(' ')}
    >
      {variantIcons[toast.variant]}
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto -mr-1 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const showToast = React.useCallback((options: ToastOptions) => {
    const item: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message: options.message,
      variant: options.variant ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION,
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        data-testid="toast-container"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
