import type { Metadata, Viewport } from 'next';
import ClientLayout from './client-layout';

export const metadata: Metadata = {
  metadataBase: new URL('https://charge.polaris.rest'),
  title: {
    default: 'Polaris Express',
    template: '%s - Polaris Express',
  },
  description: 'Park and charge your car in our personal lot.',
  openGraph: {
    title: 'Polaris Express',
    description: 'Park and charge your car in our personal lot.',
    type: 'website',
    siteName: 'Polaris Express',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    creator: '@vladzaharia',
    title: 'Polaris Express',
    description: 'Park and charge your car in our personal lot.',
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

const global = {
  title: 'Polaris Express',
  description: 'Park and charge your car in our personal lot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <ClientLayout>{children}</ClientLayout>
    </html>
  );
}
