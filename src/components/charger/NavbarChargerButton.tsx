'use client';

import { use, useCallback } from 'react';
import { ButtonReact } from '../button/ButtonReact';
import type { Charger } from '@/types/charger';

interface NavbarChargerButtonProps {
  chargerId: string;
  chargerPromise: Promise<Charger>;
  className?: string;
}

export const NavbarChargerButton = ({
  chargerId,
  chargerPromise,
  className = '',
}: NavbarChargerButtonProps) => {
  // Get initial data from the server promise
  const status = use(chargerPromise);

  const hasAvailableConnector =
    status?.connection_status === 'online' &&
    (status?.connectors?.some((c) => c.status === 'Available' || c.status === 'Preparing') ??
      false);

  // Handle button click - no optimistic updates needed for navbar button
  const handleBeginCharging = useCallback(() => {
    // Just navigate - the main page will handle optimistic updates
  }, []);

  return (
    <ButtonReact
      href={`/chargers/${chargerId}/begin`}
      variant="charger"
      show={hasAvailableConnector}
      onClick={handleBeginCharging}
      className={className}
      data-astro-prefetch
    >
      Begin Charging
    </ButtonReact>
  );
};
