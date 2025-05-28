'use client';

import { ErrorPage } from '../src/components/error/ErrorDisplay';

export default function NotFound() {
  const error = new Error('Page not found');

  return <ErrorPage error={error} type="not-found" />;
}
