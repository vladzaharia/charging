'use client';

import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faRefresh,
  faHome,
  faWifi,
  faLock,
  faServer,
  faCompass,
  faSearch,
  faClock,
} from '@awesome.me/kit-370a1eb793/icons/classic/solid';
import { SupabaseError } from '@/services/supabase';
import { VoltTimeError } from '@/services/volttime';
import { ValidationError } from '@/middleware/validation/middleware';
import { AuthenticationError, AuthorizationError, ErrorUtils } from '@/types/errors';

type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorDisplayProps {
  error: Error;
  retry?: () => void;
  context?: string;
  type?: 'charger' | 'general' | 'not-found';
  showSignIn?: boolean;
}

interface ErrorDetails {
  icon: typeof faExclamationTriangle;
  title: string;
  message: string;
  suggestion: string;
  showRetry: boolean;
  showSignIn: boolean;
  severity: ErrorSeverity;
}

/**
 * Unified error display component for all error states
 * Provides consistent styling and behavior across the application
 */
export function ErrorDisplay({
  error,
  retry,
  context,
  type = 'general',
  showSignIn = false,
}: ErrorDisplayProps) {
  // Report error for monitoring and debugging
  useEffect(() => {
    ErrorUtils.reportError(error, {
      context: context || 'unknown',
      display_type: type,
      component: 'ErrorDisplay',
    });
  }, [error, context, type]);

  // Helper function to create consistent error details
  const createErrorDetails = (
    icon: typeof faExclamationTriangle,
    title: string,
    message: string,
    suggestion: string,
    severity: ErrorSeverity = 'error',
    showRetry: boolean = true,
    showSignIn: boolean = false
  ): ErrorDetails => ({
    icon,
    title,
    message,
    suggestion,
    showRetry,
    showSignIn,
    severity,
  });

  const getErrorDetails = (): ErrorDetails => {
    // Handle specific error types first
    if (error instanceof VoltTimeError) {
      return createErrorDetails(
        faWifi,
        'Charger Connection Error',
        'Unable to connect to the charging station. The charger may be offline or experiencing connectivity issues.',
        'Please try again in a moment. If the problem persists, the charger may need maintenance.',
        'warning'
      );
    }

    if (error instanceof SupabaseError) {
      return createErrorDetails(
        faExclamationTriangle,
        'Database Connection Error',
        'Unable to load information from our database.',
        'Please check your internet connection and try again.'
      );
    }

    if (error instanceof ValidationError) {
      return createErrorDetails(
        faExclamationTriangle,
        type === 'charger' ? 'Invalid Charger ID' : 'Validation Error',
        type === 'charger'
          ? 'The charger ID provided is not valid.'
          : 'The provided information is not valid.',
        type === 'charger'
          ? 'Please check the QR code or charger ID and try again.'
          : 'Please check your input and try again.',
        'warning',
        false
      );
    }

    if (error instanceof AuthenticationError) {
      return createErrorDetails(
        faLock,
        'Authentication Required',
        'You need to sign in to access this feature.',
        'Please sign in with your account to continue.',
        'warning',
        false,
        true
      );
    }

    if (error instanceof AuthorizationError) {
      return createErrorDetails(
        faLock,
        'Access Denied',
        "You don't have permission to access this resource.",
        'Contact support if you believe this is an error.',
        'error',
        false
      );
    }

    // Handle message-based error detection
    const message = error.message.toLowerCase();

    if (message.includes('not found') || message.includes('404')) {
      if (type === 'not-found') {
        return createErrorDetails(
          faCompass,
          'Page Not Found',
          "The page you're looking for doesn't exist or has been moved.",
          "Check the URL for typos or use the navigation to find what you're looking for.",
          'warning',
          false
        );
      } else if (type === 'charger') {
        return createErrorDetails(
          faCompass,
          'Charger Not Found',
          "The charger you're looking for doesn't exist or has been removed.",
          'Please check the charger ID or QR code and try again.',
          'info'
        );
      }
    }

    if (message.includes('network') || message.includes('fetch')) {
      return createErrorDetails(
        faWifi,
        'Connection Error',
        'Unable to connect to our servers.',
        'Try refreshing the page or check your network connection.',
        'warning'
      );
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return createErrorDetails(
        faLock,
        'Authentication Required',
        type === 'charger'
          ? 'You need to sign in to access this charger.'
          : 'You need to sign in to access this page.',
        'Please sign in to continue.',
        'warning',
        false,
        true
      );
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return createErrorDetails(
        faLock,
        'Access Denied',
        "You don't have permission to access this resource.",
        'Contact support if you believe this is an error.',
        'error',
        false
      );
    }

    if (message.includes('too many requests') || message.includes('429')) {
      return createErrorDetails(
        faClock,
        'Too Many Requests',
        'You have made too many requests in a short period of time.',
        'Please wait a moment before trying again. This helps us maintain service quality for everyone.',
        'warning'
      );
    }

    if (message.includes('server') || message.includes('500')) {
      return createErrorDetails(
        faServer,
        'Server Error',
        type === 'charger'
          ? 'There was a problem loading the charger information.'
          : 'Something went wrong on our end.',
        'Please try again in a moment. If the problem persists, contact support.'
      );
    }

    // Generic error fallback
    return createErrorDetails(
      faExclamationTriangle,
      type === 'charger' ? 'Charger Unavailable' : 'Something Went Wrong',
      type === 'charger'
        ? 'Unable to load charger information at this time.'
        : 'An unexpected error occurred.',
      'Please try again or contact support if the problem continues.'
    );
  };

  const { icon, title, message, suggestion, showRetry, severity } = getErrorDetails();
  const finalShowSignIn = showSignIn || getErrorDetails().showSignIn;

  // Color scheme based on severity
  const colors = {
    error: {
      border: 'border-red-500',
      icon: 'text-red-400',
      title: 'text-red-300',
      button: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      border: 'border-yellow-500',
      icon: 'text-yellow-400',
      title: 'text-yellow-300',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      border: 'border-charge-blue',
      icon: 'text-charge-blue',
      title: 'text-charge-blue',
      button: 'bg-charge-blue hover:bg-charge-blue',
    },
  };

  const colorScheme = colors[severity];

  const handleSignIn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 bg-slate-900/10 border-2 ${colorScheme.border} rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg min-h-[200px]`}
    >
      <div className="text-center space-y-4 max-w-md">
        {/* Error Title with Icon */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`${colorScheme.icon} text-xl`}>
            <FontAwesomeIcon icon={icon} />
          </div>
          <h2 className={`text-xl font-display ${colorScheme.title}`}>{title}</h2>
        </div>

        {/* Error Message */}
        <p className="text-gray-300 text-sm leading-relaxed">{message}</p>

        {/* Suggestion */}
        <p className="text-gray-400 text-xs">{suggestion}</p>

        {/* Context Information */}
        {context && (
          <div className="mt-4 p-2 bg-slate-800/50 rounded border border-slate-600">
            <span className="text-xs text-gray-400">Context: </span>
            <span className="text-xs text-gray-300">{context}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mt-6">
          {showRetry && retry && (
            <button
              onClick={retry}
              className={`flex items-center justify-center gap-2 px-3 py-2 ${colorScheme.button} text-white rounded-lg transition-colors duration-200 text-sm`}
            >
              <FontAwesomeIcon icon={faRefresh} className="text-xs" />
              Try Again
            </button>
          )}

          {finalShowSignIn && (
            <button
              onClick={handleSignIn}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-charge-blue hover:bg-charge-blue/80 text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <FontAwesomeIcon icon={faLock} className="text-xs" />
              Sign In
            </button>
          )}

          {type === 'not-found' ? (
            <>
              <button
                onClick={handleGoHome}
                className={`flex items-center justify-center gap-2 px-3 py-2 ${colorScheme.button} text-white rounded-lg transition-colors duration-200 text-sm`}
              >
                <FontAwesomeIcon icon={faHome} className="text-xs" />
                Go Home
              </button>
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200 text-sm"
              >
                <FontAwesomeIcon icon={faSearch} className="text-xs" />
                Go Back
              </button>
            </>
          ) : (
            <button
              onClick={handleGoHome}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200 text-sm"
            >
              <FontAwesomeIcon icon={faHome} className="text-xs" />
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page error display wrapper
 * Used for error.tsx and not-found.tsx pages
 */
export function ErrorPage({
  error,
  retry,
  context,
  type = 'general',
  showSignIn = false,
}: ErrorDisplayProps) {
  return (
    <main className="flex flex-col p-6 h-screen">
      <div className="flex-1 flex flex-col items-center justify-center">
        <ErrorDisplay
          error={error}
          retry={retry}
          context={context}
          type={type}
          showSignIn={showSignIn}
        />
      </div>
    </main>
  );
}

/**
 * Compact error display for inline use
 */
export function ErrorInline({ error, retry }: { error: Error; retry?: () => void }) {
  const isAuthError = error instanceof AuthenticationError || error instanceof AuthorizationError;

  return (
    <div className="flex items-center justify-center p-3 bg-red-900/20 border border-red-500/50 rounded">
      <div className="flex items-center gap-2 text-sm">
        <FontAwesomeIcon
          icon={isAuthError ? faLock : faExclamationTriangle}
          className="text-red-400"
        />
        <span className="text-red-300">
          {isAuthError ? 'Access denied' : 'Error loading content'}
        </span>
        {retry &&
          !(error instanceof AuthenticationError || error instanceof AuthorizationError) && (
            <button
              onClick={retry}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          )}
      </div>
    </div>
  );
}
