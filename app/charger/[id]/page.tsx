import { NavbarWrapper } from '../../../src/components/NavbarWrapper';
import { ChargerStatusWrapper } from '../../../src/components/charger/ChargerStatusWrapper';
import { ChargerDataProvider } from '../../../src/components/charger/ChargerDataProvider';
import { getChargerStatus } from '../../../src/api/actions/charger';
import { HTTPError } from '../../../src/types/errors';
import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { Suspense } from 'react';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Charger ${(await params).id} - Polaris Express`,
    description: 'Park and charge your car in our personal lot.',
    openGraph: {
      title: `Charger ${(await params).id} - Polaris Express`,
      description: 'Park and charge your car in our personal lot.',
    },
    twitter: {
      title: `Charger ${(await params).id} - Polaris Express`,
      description: 'Park and charge your car in our personal lot.',
    },
  };
}

export default async function ChargerPage({ params }: Props) {
  const { id } = await params;
  if (!id) {
    redirect('/');
  }

  // Try to fetch charger data on the server, handle 404 errors with notFound()
  let chargerData;
  try {
    chargerData = await getChargerStatus(id);
  } catch (error) {
    // Handle specific HTTP errors
    if (error instanceof HTTPError) {
      switch (error.status) {
        case 404:
          notFound(); // Use Next.js not-found page
        case 401:
        case 403:
        case 500:
        case 502:
        case 503:
        default:
          // Re-throw HTTP errors to be handled by error.tsx
          throw error;
      }
    }

    // Handle other errors (network, etc.)
    if (error instanceof Error && error.message.includes('not found')) {
      notFound();
    }

    // Re-throw other errors to be handled by error boundaries
    throw error;
  }

  // Create a resolved promise for the ChargerDataProvider
  const chargerPromise = Promise.resolve(chargerData);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading charger data...</div>}>
      <ChargerDataProvider chargerId={id} chargerPromise={chargerPromise}>
        <main className="flex flex-col p-6 h-full">
          <NavbarWrapper chargerId={id} />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-4xl font-display">Welcome to Polaris Express</h2>
              <p className="text-xl">Charging made easy.</p>
            </div>
          </div>
          <ChargerStatusWrapper chargerId={id} />
        </main>
      </ChargerDataProvider>
    </Suspense>
  );
}
