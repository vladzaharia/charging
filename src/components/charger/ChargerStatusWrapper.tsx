import { ChargerButton } from './ChargerButton';
import { ChargerStatusBar } from './ChargerStatusBar';
import { ErrorBoundary } from '../error/ErrorBoundary';

interface ChargerStatusWrapperProps {
  chargerId: string;
}

export function ChargerStatusWrapper({ chargerId }: ChargerStatusWrapperProps) {
  return (
    <ErrorBoundary context="charger" type="charger">
      <ChargerStatusBar />
      <ChargerButton chargerId={chargerId} />
    </ErrorBoundary>
  );
}
