'use client';

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

interface AOSProps {
  children?: React.ReactNode;
}

export default function AOSProvider({ children }: AOSProps) {
  useEffect(() => {
    AOS.init();
  }, []);

  return <>{children}</>;
}
