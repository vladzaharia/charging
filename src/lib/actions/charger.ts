'use server';

import type { Charger } from '@/types/charger';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Server action to fetch charger status
 * Uses Next.js cache and revalidation for optimal performance
 */
export async function getChargerStatus(chargerId: string): Promise<Charger> {
  const url = new URL(`/api/charger/${chargerId}`, API_URL);

  const response = await fetch(url, {
    next: {
      tags: [`charger-${chargerId}`], // Enable on-demand revalidation
      revalidate: 30, // Match the polling interval
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch charger status');
  }

  return response.json();
}

/**
 * Trigger revalidation for a specific charger
 */
export async function revalidateCharger(chargerId: string) {
  return revalidatePath(`/api/charger/${chargerId}`);
}
