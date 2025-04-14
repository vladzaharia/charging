import Navbar from '@/components/Navbar';
import { ChargerStatusBar } from '@/components/charger/ChargerStatusBar';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface ChargerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Polaris Express',
  description: 'Park and charge your car in our personal lot.',
  openGraph: {
    title: 'Polaris Express',
    description: 'Park and charge your car in our personal lot.',
  },
  twitter: {
    title: 'Polaris Express',
    description: 'Park and charge your car in our personal lot.',
  },
};

export default async function ChargerPage({ params }: ChargerPageProps) {
  const { id } = await params;
  if (!id) {
    redirect('/');
  }

  return (
    <main className="flex flex-col p-6 h-full">
      <Navbar chargerId={id} />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-4xl font-display">Welcome to Polaris Express</h2>
          <p className="text-xl">Charging made easy.</p>
        </div>
      </div>
      <ChargerStatusBar chargerId={id} />
    </main>
  );
}
