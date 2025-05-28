import { ChargerButton } from './ChargerButton';
import { ChargerStatusBar } from './ChargerStatusBar';
import { ChargerErrorBoundary } from '../error/ChargerErrorBoundary';

interface ChargerStatusWrapperProps {
  chargerId: string;
}

export function ChargerStatusWrapper({ chargerId }: ChargerStatusWrapperProps) {
  return (
    <ChargerErrorBoundary>
      <ChargerStatusBar />
      <ChargerButton chargerId={chargerId} />
    </ChargerErrorBoundary>
  );
}
