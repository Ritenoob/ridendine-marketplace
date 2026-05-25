'use client';

import { Component, useEffect, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Please try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #ccc',
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      }).catch(() => {});
    }
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-gray-600">
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[#E85D26] px-4 py-2 text-white hover:bg-[#d44e1e]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
