'use client';

import { ReactNode, MouseEventHandler } from 'react';

/**
 * Client Button Wrapper Component
 *
 * Lightweight client component that wraps server components to add interactive features
 * like click handlers, loading states, and conditional rendering. Maintains server
 * component benefits while adding minimal client-side JavaScript for interactivity.
 *
 * Usage Examples:
 *
 * // Wrap server button with click handler
 * <ClientButtonWrapper onClick={handleClick}>
 *   <ServerButton variant="primary">Click Me</ServerButton>
 * </ClientButtonWrapper>
 *
 * // Wrap with loading state and conditional rendering
 * <ClientButtonWrapper isLoading={isPolling} show={hasData} loadingIndicator={<Spinner />}>
 *   <ServerButton variant="charger">Begin Charging</ServerButton>
 * </ClientButtonWrapper>
 *
 * // Wrap with active state for navigation
 * <ClientButtonWrapper isActive={isCurrentPage}>
 *   <ServerButton href="/scan">Scan</ServerButton>
 * </ClientButtonWrapper>
 */

interface ClientButtonWrapperProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  isActive?: boolean;
  isLoading?: boolean;
  loadingIndicator?: ReactNode;
  show?: boolean;
  className?: string;
}

export function ClientButtonWrapper({
  children,
  onClick,
  isActive = false,
  isLoading = false,
  loadingIndicator,
  show = true,
  className = '',
}: ClientButtonWrapperProps) {
  // Conditional rendering support
  if (!show) {
    return null;
  }

  // Build dynamic classes for interactive states
  const interactiveClasses = [
    isActive ? 'ring-2 ring-white/50' : '',
    isLoading ? 'animate-pulse' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div onClick={onClick} className={interactiveClasses}>
      {children}
      {isLoading &&
        (loadingIndicator || (
          <div className="inline-flex items-center ml-2">
            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
          </div>
        ))}
    </div>
  );
}
