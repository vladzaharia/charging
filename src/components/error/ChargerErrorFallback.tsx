'use client';

import React from 'react';
import { ErrorDisplay, ErrorInline } from './ErrorDisplay';

interface ChargerErrorFallbackProps {
  error: Error;
  retry: () => void;
}

/**
 * Specialized error fallback for charger-related errors
 * Provides context-specific error messages and recovery options
 * @deprecated Use ErrorDisplay with type="charger" instead
 */
export function ChargerErrorFallback({ error, retry }: ChargerErrorFallbackProps) {
  return <ErrorDisplay error={error} retry={retry} type="charger" />;
}

/**
 * Simplified charger error fallback for inline use
 * @deprecated Use ErrorInline instead
 */
export function ChargerErrorInline({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorInline error={error} retry={retry} />;
}
