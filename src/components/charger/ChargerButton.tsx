'use client';

import { use } from 'react';
import { getChargerStatus } from '@/lib/actions/charger';
import type { Charger } from '@/types/charger';
import { usePolling } from '@/hooks/usePolling';

interface ChargerButtonProps {
  chargerId: string;
  className?: string;
  chargerPromise: Promise<Charger>;
}

export const ChargerButton = ({
  chargerId,
  className = '',
  chargerPromise,
}: ChargerButtonProps) => {
  // Get initial data from the server
  const initialStatus = use(chargerPromise);

  // Set up polling for updates
  const status = usePolling<Charger>(
    initialStatus,
    () => getChargerStatus(chargerId),
    30000 // Poll every 30 seconds
  );
  const hasAvailableConnector =
    status?.connection_status === 'online' &&
    (status?.connectors?.some((c) => c.status === 'Available' || c.status === 'Preparing') ??
      false);

  if (!hasAvailableConnector) {
    return null;
  }

  const baseClasses =
    'flex flex-row items-center font-display py-4 px-6 gap-4 backdrop-blur backdrop-opacity-85 drop-shadow-lg transition-all duration-300 rounded-xl';
  const enabledClasses =
    'text-charge-green hover:text-slate-900 bg-slate-900/10 hover:bg-charge-green/75 border-charge-green border-2';

  return (
    <a
      className={`${baseClasses} ${enabledClasses} ${className}`}
      href={`/chargers/${chargerId}/begin`}
      data-astro-prefetch
    >
      Begin Charging
    </a>
  );
};
