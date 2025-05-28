'use server';

import type { Charger } from '@/types/charger';
import { HTTPError } from '@/types/errors';
import { revalidatePath, unstable_cache } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Internal function to fetch charger data with explicit caching
 */
async function fetchChargerData(chargerId: string): Promise<Charger> {
  const url = new URL(`/api/charger/${chargerId}`, API_URL);

  // Add cache debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Fetching charger ${chargerId} with cache strategy`);
  }

  const response = await fetch(url, {
    cache: 'force-cache', // Explicit caching for Next.js 15 compatibility
    next: {
      tags: [`charger-${chargerId}`], // Enable on-demand revalidation
      revalidate: 30, // Cache for 30 seconds to match polling interval
    },
  });

  if (!response.ok) {
    // Create specific HTTP errors based on status codes
    switch (response.status) {
      case 401:
        throw new HTTPError('Authentication required to access this charger', 401, 'Unauthorized');
      case 403:
        throw new HTTPError('You do not have permission to access this charger', 403, 'Forbidden');
      case 404:
        throw new HTTPError(`Charger ${chargerId} not found`, 404, 'Not Found');
      case 429:
        throw new HTTPError('Too many requests. Please try again later', 429, 'Too Many Requests');
      case 500:
        throw new HTTPError(
          'Internal server error. Please try again later',
          500,
          'Internal Server Error'
        );
      case 502:
        throw new HTTPError(
          'Bad gateway. The charger service is temporarily unavailable',
          502,
          'Bad Gateway'
        );
      case 503:
        throw new HTTPError(
          'Service unavailable. Please try again later',
          503,
          'Service Unavailable'
        );
      default:
        throw new HTTPError(
          `Failed to fetch charger status: ${response.statusText || 'Unknown error'}`,
          response.status,
          response.statusText
        );
    }
  }

  return response.json();
}

/**
 * Server action to fetch charger status with enhanced caching
 * Uses both fetch cache and unstable_cache for optimal performance
 */
export const getChargerStatus = unstable_cache(
  async (chargerId: string): Promise<Charger> => {
    return fetchChargerData(chargerId);
  },
  ['charger-status'],
  {
    revalidate: 30,
    tags: ['charger'],
  }
);

/**
 * Trigger revalidation for a specific charger
 */
export async function revalidateCharger(chargerId: string) {
  return revalidatePath(`/api/charger/${chargerId}`);
}
