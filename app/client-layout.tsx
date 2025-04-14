'use client';

import { JetBrains_Mono, Maven_Pro, Space_Mono } from 'next/font/google';
import AOSProvider from '@/components/util/AOS';
import Background from '@/components/background/Background';
import Backdrop from '@/components/background/Backdrop';

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
        <AOSProvider>
          <Backdrop
            data-aos="fade-up"
            className="absolute top-2 left-2 right-2 bottom-2 rounded-xl backdrop-opacity-95 bg-slate-900/80"
          >
            {children}
          </Backdrop>
        </AOSProvider>
      </Background>
    </body>
  );
}
