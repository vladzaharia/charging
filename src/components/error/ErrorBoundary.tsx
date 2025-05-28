'use client';

import React, { Component, ReactNode } from 'react';
import { SupabaseError } from '@/services/supabase';
import { VoltTimeError } from '@/services/volttime';
import { ValidationError } from '@/middleware/validation/middleware';
import { AuthenticationError, AuthorizationError } from '@/types/errors';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, action: string, parameters?: Record<string, unknown>) => void;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: 'charger' | 'auth' | 'general' | 'navbar';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React 19 compatible error boundary with enhanced error handling
 * Integrates with existing error class infrastructure
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error with context
    console.error(`Error in ${this.props.context || 'unknown'} context:`, error);
    console.error('Error info:', errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: this.props.context || 'unknown',
          component_stack: errorInfo.componentStack,
        },
      });
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default fallback based on error type and context
      return this.renderDefaultFallback(this.state.error);
    }

    return this.props.children;
  }

  private renderDefaultFallback(error: Error) {
    const { context } = this.props;

    // Determine error type and appropriate message
    let title = 'Something went wrong';
    let message = 'An unexpected error occurred. Please try again.';
    let showRetry = true;

    if (error instanceof SupabaseError) {
      title = 'Database Error';
      message = 'Unable to connect to the database. Please check your connection and try again.';
    } else if (error instanceof VoltTimeError) {
      title = 'Charger Service Error';
      message = 'Unable to connect to the charging service. Please try again in a moment.';
    } else if (error instanceof ValidationError) {
      title = 'Invalid Data';
      message = error.getSimpleMessage();
      showRetry = false;
    } else if (error instanceof AuthenticationError) {
      title = 'Authentication Required';
      message = 'Please sign in to continue.';
      showRetry = false;
    } else if (error instanceof AuthorizationError) {
      title = 'Access Denied';
      message = 'You do not have permission to access this resource.';
      showRetry = false;
    }

    // Context-specific customization
    if (context === 'charger') {
      if (error instanceof SupabaseError || error instanceof VoltTimeError) {
        title = 'Charger Unavailable';
        message =
          'Unable to load charger information. Please try again or contact support if the problem persists.';
      }
    }

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/10 border-2 border-red-500 rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-display text-white">{title}</h2>
          <p className="text-gray-300 text-sm">{message}</p>

          {showRetry && (
            <button
              onClick={this.retry}
              className="mt-4 px-4 py-2 bg-charge-blue hover:bg-charge-blue/80 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Try Again
            </button>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-gray-400 text-xs hover:text-gray-300">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-slate-800 rounded text-xs text-gray-300 overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
