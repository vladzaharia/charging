'use client';

import { useContext, useCallback, ReactNode } from 'react';
import { ChargerDataContext } from '../charger/ChargerDataProvider';

/**
 * Client Charger Wrapper Component
 *
 * Specialized client wrapper for charger buttons that handles optimistic updates
 * and charger-specific interactions. Integrates with ChargerDataProvider context
 * to provide real-time data and optimistic feedback while keeping button rendering
 * on the server.
 *
 * Usage Examples:
 *
 * // Wrap server charger button with optimistic updates
 * <ClientChargerWrapper chargerId="ABC12345">
 *   <ServerButton variant="charger">Begin Charging</ServerButton>
 * </ClientChargerWrapper>
 *
 * // With custom optimistic update logic
 * <ClientChargerWrapper
 *   chargerId="ABC12345"
 *   onOptimisticUpdate={customUpdateLogic}
 * >
 *   <ServerButton variant="charger">Start Session</ServerButton>
 * </ClientChargerWrapper>
 */

interface ClientChargerWrapperProps {
  children: ReactNode;
  chargerId: string;
  className?: string;
  onOptimisticUpdate?: (chargerId: string, context: unknown) => void;
  show?: boolean;
}

export function ClientChargerWrapper({
  children,
  chargerId,
  className = '',
  onOptimisticUpdate,
  show = true,
}: ClientChargerWrapperProps) {
  // Get charger data context
  const context = useContext(ChargerDataContext);

  // Handle charger button click with optimistic feedback
  const handleChargerAction = useCallback(() => {
    if (!context) return;

    // Use custom optimistic update logic if provided
    if (onOptimisticUpdate) {
      onOptimisticUpdate(chargerId, context);
      return;
    }

    // Default optimistic update: set connectors to "Preparing" state
    const optimisticConnectors =
      context.status?.connectors?.map((connector) =>
        connector.status === 'Available'
          ? { ...connector, status: 'Preparing' as const }
          : connector
      ) || [];

    context.addOptimisticUpdate({
      connectors: optimisticConnectors,
    });

    // Navigation will be handled by the href on the server button
  }, [chargerId, context, onOptimisticUpdate]);

  // Don't render if context is missing or show is false
  if (!context || !show) {
    return null;
  }

  // Get shared charger data from provider
  const { status, isPolling } = context;

  // Determine if charger has available connectors
  const hasAvailableConnector =
    status?.connection_status === 'online' &&
    (status?.connectors?.some((c) => c.status === 'Available' || c.status === 'Preparing') ??
      false);

  // Don't render if no available connectors
  if (!hasAvailableConnector) {
    return null;
  }

  // Build wrapper classes
  const wrapperClasses = [isPolling ? 'animate-pulse' : '', 'cursor-pointer', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div onClick={handleChargerAction} className={wrapperClasses}>
      {children}
      {/* Loading indicator for polling state */}
      {isPolling && (
        <div className="inline-flex items-center ml-2">
          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
