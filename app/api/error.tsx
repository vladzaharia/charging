'use client';

import { useEffect } from 'react';

interface APIErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function APIErrorPage({ error, reset }: APIErrorPageProps) {
  useEffect(() => {
    // Log API error
    console.error('API error:', error);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: 'api_error',
          digest: error.digest,
        },
      });
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full p-6 rounded-xl border-2 border-red-500 bg-red-900/10 backdrop-blur backdrop-opacity-85">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold text-red-300">API Error</h1>
          <p className="text-white">There was a problem with the API request.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
