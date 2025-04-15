'use server';

import { Suspense } from 'react';
import { getChargerStatus } from '../../lib/actions/charger';
import { ChargerButton } from './ChargerButton';
import { ChargerStatusBar } from './ChargerStatusBar';

interface ChargerStatusWrapperProps {
  chargerId: string;
}

export async function ChargerStatusWrapper({ chargerId }: ChargerStatusWrapperProps) {
  // Fetch data on the server
  const chargerPromise = getChargerStatus(chargerId);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading charger status...</div>}>
      {/* Pass the promise to client components */}
      <ChargerStatusBar chargerId={chargerId} chargerPromise={chargerPromise} />
      <ChargerButton chargerId={chargerId} chargerPromise={chargerPromise} />
    </Suspense>
  );
}
