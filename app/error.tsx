'use client';

import { useEffect } from 'react';
import { ErrorPage } from '../src/components/error/ErrorDisplay';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console and monitoring service
    console.error('Global error:', error);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
        custom_map: {
          context: 'global_error',
          digest: error.digest,
          stack: error.stack,
        },
      });
    }
  }, [error]);

  return <ErrorPage error={error} retry={reset} context="global_error" type="general" />;
}
