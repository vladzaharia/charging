'use client';

import React, { Component, ReactNode } from 'react';
import { GeneralErrorFallback } from './GeneralErrorFallback';

interface NavbarErrorBoundaryProps {
  children: ReactNode;
}

interface NavbarErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Specialized error boundary for navbar components
 * Pre-configured with appropriate fallback and error handling
 */
export class NavbarErrorBoundary extends Component<
  NavbarErrorBoundaryProps,
  NavbarErrorBoundaryState
> {
  constructor(props: NavbarErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NavbarErrorBoundaryState> {
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
    console.error('Navbar error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: 'navbar',
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
      return (
        <GeneralErrorFallback error={this.state.error} retry={this.retry} context="Navigation" />
      );
    }

    return this.props.children;
  }
}
