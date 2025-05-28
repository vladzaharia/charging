'use client';

import { createContext, useContext, use, useOptimistic, useCallback, useMemo } from 'react';
import { getChargerStatus } from '@/api/actions/charger';
import type { Charger } from '@/types/charger';
import { usePolling } from '@/hooks/usePolling';

interface ChargerDataContextType {
  status: Charger | null;
  isPolling: boolean;
  addOptimisticUpdate: (update: Partial<Charger>) => void;
  retry: () => void;
}

export const ChargerDataContext = createContext<ChargerDataContextType | null>(null);

interface ChargerDataProviderProps {
  children: React.ReactNode;
  chargerId: string;
  chargerPromise: Promise<Charger>;
}

export function ChargerDataProvider({
  children,
  chargerId,
  chargerPromise,
}: ChargerDataProviderProps) {
  // Get initial data from the server
  const initialStatus = use(chargerPromise);

  // Memoize the polling function to prevent unnecessary re-renders
  const pollingFunction = useCallback(() => getChargerStatus(chargerId), [chargerId]);

  // Memoize callback functions to prevent unnecessary re-renders
  const onError = useCallback(
    (error: Error, retryCount: number) => {
      console.error(`Charger ${chargerId} polling error (attempt ${retryCount}):`, error);
    },
    [chargerId]
  );

  const onSuccess = useCallback(
    (data: unknown) => {
      // Add success logging in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Charger ${chargerId} data updated:`, data);
      }
    },
    [chargerId]
  );

  // Memoize polling options to prevent unnecessary re-renders
  const pollingOptions = useMemo(
    () => ({
      maxRetries: 3,
      pauseWhenHidden: true,
      refetchOnFocus: true,
      adaptivePolling: true,
      jitterRange: 0.1,
      onError,
      onSuccess,
    }),
    [onError, onSuccess]
  );

  // Set up polling for updates with enhanced features
  const {
    data: pollingStatus,
    isPolling,
    retry,
  } = usePolling<Charger>(initialStatus, pollingFunction, 30000, true, pollingOptions);

  // Optimistic updates for immediate user feedback
  const [optimisticStatus, addOptimisticUpdate] = useOptimistic(
    pollingStatus,
    (currentStatus: Charger, optimisticUpdate: Partial<Charger>) => ({
      ...currentStatus,
      ...optimisticUpdate,
      connectors: optimisticUpdate.connectors || currentStatus.connectors,
    })
  );

  // Use optimistic status for rendering, fall back to polling status
  const status = optimisticStatus || pollingStatus;

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): ChargerDataContextType => ({
      status,
      isPolling,
      addOptimisticUpdate,
      retry,
    }),
    [status, isPolling, addOptimisticUpdate, retry]
  );

  return <ChargerDataContext.Provider value={contextValue}>{children}</ChargerDataContext.Provider>;
}

export function useChargerData(): ChargerDataContextType {
  const context = useContext(ChargerDataContext);
  if (!context) {
    throw new Error('useChargerData must be used within a ChargerDataProvider');
  }
  return context;
}
