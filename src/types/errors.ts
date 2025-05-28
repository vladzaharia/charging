/**
 * Error classes that can be safely imported by both client and server components
 * These are separated from the auth middleware to avoid next/headers import issues
 */

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public status: number = 401,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class for permission-related errors
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public status: number = 403,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * HTTP error class for API responses
 */
export class HTTPError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}
