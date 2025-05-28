import Navbar from './Navbar';
import { NavbarErrorBoundary } from './error/NavbarErrorBoundary';

interface NavbarWrapperProps {
  chargerId?: string;
}

export function NavbarWrapper({ chargerId }: NavbarWrapperProps) {
  return (
    <NavbarErrorBoundary>
      <Navbar chargerId={chargerId} />
    </NavbarErrorBoundary>
  );
}
