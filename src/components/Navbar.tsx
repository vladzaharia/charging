import { Icon } from '@iconify/react';
import { ChargerButton } from './charger/ChargerButton';
import { AuthButton } from './auth/AuthButton';
import Button from './Button';
import type { Charger } from '../types/charger';

interface NavbarProps {
  chargerId?: string;
  chargerPromise?: Promise<Charger>;
}

export default function Navbar({ chargerId, chargerPromise }: NavbarProps) {
  return (
    <div className="flex flex-none justify-between items-center">
      <img
        src="/wordmark.svg"
        alt="Wordmark"
        className="text-6xl hidden md:block transition-all duration-300"
        height="20%"
        width="20%"
      />
      <img
        src="/logo.svg"
        alt="Logo"
        className="text-6xl block md:hidden transition-all duration-300"
        height="20%"
        width="20%"
      />

      <nav className="flex flex-row gap-4">
        {chargerId && chargerPromise && (
          <ChargerButton chargerId={chargerId} chargerPromise={chargerPromise} />
        )}
        <Button path="/scan" className="text-3xl hover:fill-slate-900">
          <Icon icon="fa/scan-button-color" />
        </Button>
        <AuthButton />
      </nav>
    </div>
  );
}
