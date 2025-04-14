'use client';

import { JetBrains_Mono, Maven_Pro, Space_Mono } from 'next/font/google';
import AOSProvider from '@/components/util/AOS';
import Background from '@/components/background/Background';

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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <body
      className={`${mavenPro.variable} ${jetbrainsMono.variable} ${spaceMono.variable} font-body text-slate-100 bg-slate-900 overflow-hidden relative`}
    >
      <Background className="w-screen h-screen absolute top-0 left-0 right-0 bottom-0">
        <AOSProvider>{children}</AOSProvider>
      </Background>
      <style jsx global>{`
        [data-glow] {
          position: relative;
        }

        [data-glow]::after {
          content: '';
          position: absolute;
          inset: -8px;
          background: radial-gradient(
            circle at center,
            var(--glow-color, theme(colors.charge-blue)) / 0.75,
            transparent 60%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          border-radius: inherit;
        }

        [data-glow][data-glow-hover]:hover::after {
          opacity: 1;
        }
      `}</style>
    </body>
  );
}
