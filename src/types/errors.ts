/**
 * Error classes that can be safely imported by both client and server components
 * These are separated from the auth middleware to avoid next/headers import issues
 */

/**
 * Error severity levels for better categorization
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for better organization
 */
export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'server'
  | 'client'
  | 'external';

/**
 * Base error interface with enhanced metadata
 */
export interface ErrorMetadata {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  correlationId?: string;
  timestamp?: Date;
  context?: Record<string, unknown>;
  retryable?: boolean;
  userMessage?: string;
}

/**
 * Enhanced authentication error class
 */
export class AuthenticationError extends Error {
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    public status: number = 401,
    public code?: string,
    metadata: Partial<ErrorMetadata> = {}
  ) {
    super(message);
    this.name = 'AuthenticationError';
    this.metadata = {
      severity: 'medium',
      category: 'authentication',
      timestamp: new Date(),
      retryable: false,
      userMessage: 'Please sign in to continue',
      ...metadata,
    };
  }
}

/**
 * Enhanced authorization error class for permission-related errors
 */
export class AuthorizationError extends Error {
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    public status: number = 403,
    public code?: string,
    metadata: Partial<ErrorMetadata> = {}
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.metadata = {
      severity: 'medium',
      category: 'authorization',
      timestamp: new Date(),
      retryable: false,
      userMessage: 'You do not have permission to access this resource',
      ...metadata,
    };
  }
}

/**
 * Enhanced HTTP error class for API responses
 */
export class HTTPError extends Error {
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    public status: number,
    public statusText?: string,
    metadata: Partial<ErrorMetadata> = {}
  ) {
    super(message);
    this.name = 'HTTPError';

    // Determine severity and retryability based on status code
    const isServerError = status >= 500;
    const isRetryable = status === 429 || status >= 500;

    this.metadata = {
      severity: isServerError ? 'high' : 'medium',
      category: 'network',
      timestamp: new Date(),
      retryable: isRetryable,
      userMessage: this.getDefaultUserMessage(status),
      context: { statusCode: status, statusText },
      ...metadata,
    };
  }

  private getDefaultUserMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please sign in.';
      case 403:
        return 'Access denied. You do not have permission for this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

/**
 * Error utility functions for enhanced error handling
 */
export class ErrorUtils {
  /**
   * Generate a correlation ID for error tracking
   */
  static generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: Error): boolean {
    if (
      error instanceof HTTPError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return error.metadata.retryable ?? false;
    }
    return false;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: Error): string {
    if (
      error instanceof HTTPError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return error.metadata.userMessage ?? error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get error severity
   */
  static getSeverity(error: Error): ErrorSeverity {
    if (
      error instanceof HTTPError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return error.metadata.severity ?? 'medium';
    }
    return 'medium';
  }

  /**
   * Create error context for logging
   */
  static createErrorContext(
    error: Error,
    additionalContext?: Record<string, unknown>
  ): Record<string, unknown> {
    const baseContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (
      error instanceof HTTPError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      return {
        ...baseContext,
        metadata: error.metadata,
        ...additionalContext,
      };
    }

    return {
      ...baseContext,
      ...additionalContext,
    };
  }

  /**
   * Report error to monitoring service
   */
  static reportError(error: Error, context?: Record<string, unknown>): void {
    const errorContext = this.createErrorContext(error, context);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', errorContext);
    }

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: this.getSeverity(error) === 'critical',
        custom_map: errorContext,
      });
    }
  }
}
