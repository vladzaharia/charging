/**
 * Unified Error Component System
 *
 * This module provides a consolidated error handling system with consistent
 * styling and behavior across the application.
 *
 * ## Main Components:
 *
 * - `ErrorDisplay`: Core error display component with customizable types
 * - `ErrorPage`: Full-page error wrapper for error.tsx and not-found.tsx
 * - `ErrorInline`: Compact error display for inline use
 * - `ErrorBoundary`: Unified error boundary with configurable context and type
 * - `withErrorBoundary`: Higher-order component for wrapping components with error boundary
 *
 * ## Usage Examples:
 *
 * ```tsx
 * // Full-page error (for error.tsx, not-found.tsx)
 * <ErrorPage error={error} retry={reset} type="general" />
 *
 * // Charger-specific error
 * <ErrorDisplay error={error} retry={retry} type="charger" />
 *
 * // General error with context
 * <ErrorDisplay error={error} retry={retry} context="user_profile" type="general" />
 *
 * // 404 page
 * <ErrorPage error={new Error('Page not found')} type="not-found" />
 *
 * // Inline error
 * <ErrorInline error={error} retry={retry} />
 *
 * // Error boundary
 * <ErrorBoundary context="charger" type="charger">
 *   <ChargerComponent />
 * </ErrorBoundary>
 *
 * // HOC wrapper
 * const SafeComponent = withErrorBoundary(MyComponent, { context: 'general' });
 * ```
 */

// Main unified components
export { ErrorDisplay, ErrorPage, ErrorInline } from './ErrorDisplay';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
