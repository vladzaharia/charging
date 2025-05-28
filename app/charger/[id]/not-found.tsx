'use client';

import { ErrorPage } from '../../../src/components/error/ErrorDisplay';

export default function ChargerNotFound() {
  const error = new Error('Charger not found');

  const handleRetry = () => {
    // Refresh the page to retry
    window.location.reload();
  };

  return <ErrorPage error={error} retry={handleRetry} type="charger" />;
}
