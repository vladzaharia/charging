'use client';

import { useState, useEffect } from 'react';
import type { Charger } from '../types/charger';

export const useChargerStatus = (chargerId: string) => {
  const [status, setStatus] = useState<Charger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/charger/${chargerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch charger status');
        }
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Reset state when charger ID changes
    setStatus(null);
    setError(null);
    setLoading(true);

    // Initial fetch
    fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);

    return () => clearInterval(interval);
  }, [chargerId]); // Re-run effect when charger ID changes

  return { status, error, loading };
};
