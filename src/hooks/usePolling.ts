'use client';

import { useEffect, useState } from 'react';

export function usePolling<T>(
  initialData: T,
  pollingFunction: () => Promise<T>,
  intervalMs: number = 30000, // Default to 30 seconds
  enabled: boolean = true
) {
  const [data, setData] = useState<T>(initialData);

  useEffect(() => {
    if (!enabled) return;

    // Initial poll
    let isSubscribed = true;
    const pollData = async () => {
      try {
        const newData = await pollingFunction();
        if (isSubscribed) {
          setData(newData);
        }
      } catch (error) {
        console.error('Error polling data:', error);
      }
    };

    // Set up polling interval
    const intervalId = setInterval(pollData, intervalMs);

    // Clean up
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [pollingFunction, intervalMs, enabled]);

  return data;
}
