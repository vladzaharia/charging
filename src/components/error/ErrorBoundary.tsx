'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

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
  type?: 'charger' | 'general' | 'not-found';
  showSignIn?: boolean;
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

      // Use unified ErrorDisplay component
      return (
        <ErrorDisplay
          error={this.state.error}
          retry={this.retry}
          context={this.props.context}
          type={this.props.type || (this.props.context === 'charger' ? 'charger' : 'general')}
          showSignIn={this.props.showSignIn}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 * @param Component - Component to wrap
 * @param options - Error boundary options
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
