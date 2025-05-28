import Navbar from './Navbar';
import { ErrorBoundary } from './error/ErrorBoundary';

interface NavbarWrapperProps {
  chargerId?: string;
}

export function NavbarWrapper({ chargerId }: NavbarWrapperProps) {
  return (
    <ErrorBoundary context="navbar" type="general">
      <Navbar chargerId={chargerId} />
    </ErrorBoundary>
  );
}
