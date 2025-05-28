'use client';

import { useCallback, useContext, memo } from 'react';
import { ButtonReact } from '../button/ButtonReact';
import { ChargerDataContext } from './ChargerDataProvider';

interface ChargerButtonProps {
  chargerId: string;
  className?: string;
}

const ChargerButtonComponent = ({ chargerId, className = '' }: ChargerButtonProps) => {
  // Check if we're within a ChargerDataProvider context
  const context = useContext(ChargerDataContext);

  // Handle button click with optimistic feedback - must be defined before early return
  const handleBeginCharging = useCallback(() => {
    if (!context) return;

    // Optimistically update connectors to show "Preparing" state
    const optimisticConnectors =
      context.status?.connectors?.map((connector) =>
        connector.status === 'Available'
          ? { ...connector, status: 'Preparing' as const }
          : connector
      ) || [];

    context.addOptimisticUpdate({
      connectors: optimisticConnectors,
    });

    // Continue with navigation (the optimistic state will be corrected by polling)
  }, [context]);

  // If no context, don't render the button (used on pages without charger data)
  if (!context) {
    return null;
  }

  // Get shared charger data from provider
  const { status, isPolling } = context;

  const hasAvailableConnector =
    status?.connection_status === 'online' &&
    (status?.connectors?.some((c) => c.status === 'Available' || c.status === 'Preparing') ??
      false);

  return (
    <ButtonReact
      href={`/chargers/${chargerId}/begin`}
      variant="charger"
      show={hasAvailableConnector}
      isLoading={isPolling}
      onClick={handleBeginCharging}
      className={className}
      data-astro-prefetch
    >
      Begin Charging
    </ButtonReact>
  );
};

export const ChargerButton = memo(ChargerButtonComponent);
