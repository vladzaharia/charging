'use client';

import React, { Component, ReactNode } from 'react';
import { ChargerErrorFallback } from './ChargerErrorFallback';

interface ChargerErrorBoundaryProps {
  children: ReactNode;
}

interface ChargerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Specialized error boundary for charger components
 * Pre-configured with appropriate fallback and error handling
 */
export class ChargerErrorBoundary extends Component<
  ChargerErrorBoundaryProps,
  ChargerErrorBoundaryState
> {
  constructor(props: ChargerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChargerErrorBoundaryState> {
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
    console.error('Charger error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: 'charger',
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
      return <ChargerErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}
