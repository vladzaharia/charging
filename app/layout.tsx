import { JetBrains_Mono, Maven_Pro, Space_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import ClientLayout from './client-layout';
import './globals.css';

const mavenPro = Maven_Pro({
  subsets: ['latin'],
  variable: '--font-maven-pro',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={`${mavenPro.variable} ${jetbrainsMono.variable} ${spaceMono.variable}`}
      lang="en"
    >
      <ClientLayout>{children}</ClientLayout>
    </html>
  );
}
