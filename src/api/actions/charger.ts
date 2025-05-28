'use server';

import type { Charger } from '@/types/charger';
import { HTTPError } from '@/types/errors';
import { revalidatePath, unstable_cache } from 'next/cache';

/**
 * Server action result type for React 19 error handling patterns
 */
export type ServerActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      code?: string;
      status?: number;
    };

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
 * Modern server action with React 19 error handling patterns
 * Returns a result object instead of throwing errors
 */
export async function getChargerStatusSafe(
  chargerId: string
): Promise<ServerActionResult<Charger>> {
  try {
    const charger = await fetchChargerData(chargerId);
    return {
      success: true,
      data: charger,
    };
  } catch (error) {
    // Handle different error types and return structured error responses
    if (error instanceof HTTPError) {
      return {
        success: false,
        error: error.message,
        status: error.status,
        code: error.statusText,
      };
    }

    // Handle unexpected errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500,
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Server action for form submissions with error state management
 * Compatible with useActionState hook
 */
export async function submitChargerAction(
  _prevState: ServerActionResult<string> | null,
  formData: FormData
): Promise<ServerActionResult<string>> {
  try {
    const chargerId = formData.get('chargerId') as string;

    if (!chargerId) {
      return {
        success: false,
        error: 'Charger ID is required',
        status: 400,
        code: 'VALIDATION_ERROR',
      };
    }

    // Validate charger ID format (8 characters, non-lowercase alphabet)
    if (!/^[A-Z0-9]{8}$/.test(chargerId)) {
      return {
        success: false,
        error: 'Invalid charger ID format',
        status: 400,
        code: 'VALIDATION_ERROR',
      };
    }

    // Attempt to fetch charger to validate it exists
    const result = await getChargerStatusSafe(chargerId);

    if (!result.success) {
      return result as ServerActionResult<string>;
    }

    // Simulate some action (e.g., starting charging session)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      data: `Successfully connected to charger ${chargerId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500,
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Trigger revalidation for a specific charger
 */
export async function revalidateCharger(chargerId: string) {
  return revalidatePath(`/api/charger/${chargerId}`);
}
