import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polaris Express',
};

export default function HomePage() {
  return (
    <main className="flex flex-col p-6 h-full">
      <Navbar />

      <section className="flex flex-col items-center justify-center gap-8 text-center flex-1">
        <h1 className="text-4xl font-semibold">Welcome to Polaris Express</h1>
        <p className="text-xl text-gray-400 max-w-2xl">
          To begin charging your vehicle, scan the QR code on your charging station or click the
          scan button in the top-right corner.
        </p>
      </section>
    </main>
  );
}
