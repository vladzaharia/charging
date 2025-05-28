'use client';

import React from 'react';
import { ErrorDisplay, ErrorInline } from './ErrorDisplay';

interface GeneralErrorFallbackProps {
  error: Error;
  retry: () => void;
  context?: string;
}

/**
 * General purpose error fallback for non-charger specific errors
 * Handles authentication, authorization, validation, and generic errors
 * @deprecated Use ErrorDisplay with type="general" instead
 */
export function GeneralErrorFallback({ error, retry, context }: GeneralErrorFallbackProps) {
  return <ErrorDisplay error={error} retry={retry} context={context} type="general" />;
}

/**
 * Compact error fallback for smaller UI areas
 * @deprecated Use ErrorInline instead
 */
export function GeneralErrorInline({ error, retry }: { error: Error; retry: () => void }) {
  return <ErrorInline error={error} retry={retry} />;
}
