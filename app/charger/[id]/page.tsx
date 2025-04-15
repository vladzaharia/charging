import { NavbarWrapper } from '../../../src/components/NavbarWrapper';
import { ChargerStatusWrapper } from '../../../src/components/charger/ChargerStatusWrapper';
import type { Metadata, ResolvingMetadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
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

  return (
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
  );
}
