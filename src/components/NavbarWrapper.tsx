'use server';

import { Suspense } from 'react';
import { getChargerStatus } from '../api/actions/charger';
import Navbar from './Navbar';

interface NavbarWrapperProps {
  chargerId?: string;
}

export async function NavbarWrapper({ chargerId }: NavbarWrapperProps) {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <Navbar
        chargerId={chargerId}
        chargerPromise={chargerId ? getChargerStatus(chargerId) : undefined}
      />
    </Suspense>
  );
}
