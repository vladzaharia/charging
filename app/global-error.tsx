'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical global error
    console.error('Critical global error:', error);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true,
        custom_map: {
          context: 'global_critical_error',
          digest: error.digest,
          stack: error.stack,
        },
      });
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-white">
          <div className="max-w-md w-full p-6 rounded-xl border-2 border-red-500 bg-red-900/10 backdrop-blur backdrop-opacity-85">
            <div className="text-center space-y-4">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-red-300">Critical Application Error</h1>
              <p className="text-white">
                A critical error has occurred that prevented the application from loading properly.
              </p>
              <p className="text-gray-300 text-sm">
                Please try refreshing the page. If the problem persists, contact support.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = '/';
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
