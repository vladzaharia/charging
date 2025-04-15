'use client';

import useSWR from 'swr';
import { getChargerStatus } from '../lib/actions/charger';

export const useChargerStatus = (chargerId: string) => {
  const { data, error, isLoading } = useSWR(
    chargerId ? `charger-${chargerId}` : null,
    () => getChargerStatus(chargerId),
    {
      refreshInterval: 30000, // Match server revalidation time
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    status: data,
    error: error?.message ?? null,
    loading: isLoading,
  };
};
