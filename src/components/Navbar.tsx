import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode } from '@awesome.me/kit-370a1eb793/icons/classic/solid';
import Image from 'next/image';
import { ChargerButton } from './charger/ChargerButton';
import { AuthButton } from './auth/AuthButton';
import Button from './Button';

interface NavbarProps {
  chargerId?: string;
}

export default function Navbar({ chargerId }: NavbarProps) {
  return (
    <div className="flex flex-none justify-between items-center">
      <Image
        src="/wordmark.svg"
        alt="Wordmark"
        className="text-6xl hidden md:block transition-all duration-300"
        width={120}
        height={24}
        priority
      />
      <Image
        src="/logo.svg"
        alt="Logo"
        className="text-6xl block md:hidden transition-all duration-300"
        width={48}
        height={48}
        priority
      />

      <nav className="flex flex-row gap-4">
        {chargerId && <ChargerButton chargerId={chargerId} />}
        <Button path="/scan" className="text-3xl hover:text-slate-900">
          <FontAwesomeIcon icon={faQrcode} />
        </Button>
        <AuthButton />
      </nav>
    </div>
  );
}
