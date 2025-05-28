'use client';

import { useEffect } from 'react';
import { ErrorPage } from '../../src/components/error/ErrorDisplay';

interface ChargerErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChargerErrorPage({ error, reset }: ChargerErrorPageProps) {
  useEffect(() => {
    // Log charger-specific error
    console.error('Charger error:', error);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: 'charger_error',
          digest: error.digest,
        },
      });
    }
  }, [error]);

  return <ErrorPage error={error} retry={reset} context="charger_error" type="charger" />;
}
