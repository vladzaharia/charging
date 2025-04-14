import { Icon } from '@iconify/react';
import { ChargerButton } from './charger/ChargerButton';
import { AuthButton } from './auth/AuthButton';
import Button from './Button';

interface NavbarProps {
  chargerId?: string;
}

export default function Navbar({ chargerId }: NavbarProps) {
  return (
    <div className="flex flex-none justify-between items-center">
      <h1 className="text-4xl font-display text-charge-blue" data-aos="fade-right">
        <Icon icon="wordmark" className="text-6xl hidden md:block" />
        <Icon icon="logo" className="text-6xl block md:hidden" />
      </h1>

      <nav className="flex flex-row gap-4">
        {chargerId && <ChargerButton chargerId={chargerId} />}
        <Button path="/scan" className="text-3xl hover:fill-slate-900">
          <Icon icon="fa/scan-button-color" />
        </Button>
        <AuthButton />
      </nav>
    </div>
  );
}
