'use client';

import { use } from 'react';
import { getChargerStatus } from '@/api/actions/charger';
import type { Charger, Connector, ConnectorStatus as ConnectorStatusType } from '@/types/charger';
import { usePolling } from '@/hooks/usePolling';
import { ConnectorStatus } from './ConnectorStatus';
import { statusColors } from '../../utils/colors';
import type { ColorSet } from '../../utils/colors';
import { faQrcode } from '@awesome.me/kit-370a1eb793/icons/classic/solid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const getConnectorStatusColor = (status: ConnectorStatusType): ColorSet => {
  switch (status) {
    case 'Available':
      return statusColors.green;
    case 'Preparing':
    case 'Finishing':
    case 'Paused':
    case 'SuspendedEV':
    case 'SuspendedEVSE':
      return statusColors.yellow;
    case 'Charging':
      return statusColors.blue;
    case 'Faulted':
      return statusColors.red;
    default:
      return statusColors.slate;
  }
};

const getGlobalStatus = (connectors: Connector[] = [], isOnline: boolean): ColorSet => {
  if (!isOnline) return statusColors.red;

  const statuses = new Set(connectors.map((c) => c.status));

  // If all connectors are unavailable or faulted
  if (
    connectors.length > 0 &&
    connectors.every((c) => c.status === 'Unavailable' || c.status === 'Faulted')
  ) {
    return statusColors.red;
  }

  // If any connector is charging
  if (statuses.has('Charging')) {
    return statusColors.blue;
  }

  // If any connector is available
  if (statuses.has('Available')) {
    return statusColors.green;
  }

  // If all connectors are preparing
  if (statuses.has('Preparing')) {
    return statusColors.yellow;
  }

  return statusColors.slate;
};

interface ChargerStatusBarProps {
  chargerId: string;
  className?: string;
  chargerPromise: Promise<Charger>;
}

export const ChargerStatusBar = ({
  chargerId,
  className = '',
  chargerPromise,
}: ChargerStatusBarProps) => {
  // Get initial data from the server
  const initialStatus = use(chargerPromise);

  // Set up polling for updates
  const status = usePolling<Charger>(
    initialStatus,
    () => getChargerStatus(chargerId),
    30000 // Poll every 30 seconds
  );

  const globalStatus = status
    ? getGlobalStatus(status.connectors, status.connection_status === 'online')
    : statusColors.slate;

  return (
    <div className={`flex-none ${className}`}>
      <div
        className={`bg-slate-900/10 border-2 rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg ${globalStatus.border}`}
      >
        <div className="container mx-auto p-4 text-white">
          {status && (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between w-full">
              {status.code && (
                <div className="flex-1">
                  <div className="w-fit font-mono p-3 pr-4 border-2 rounded-xl border-charge-blue flex-row gap-4 items-center justify-center md:flex hidden">
                    <span className="text-charge-green">
                      <FontAwesomeIcon icon={faQrcode} className="text-4xl" />
                    </span>
                    <div className="flex flex-col items-center">
                      <span>
                        {[...status.code].slice(0, 4).map((char, i) => (
                          <span
                            key={i}
                            className={
                              /[0-9]/.test(char) ? 'text-charge-green' : 'text-charge-blue'
                            }
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                      <span>
                        {[...status.code].slice(4).map((char, i) => (
                          <span
                            key={i + 4}
                            className={
                              /[0-9]/.test(char) ? 'text-charge-green' : 'text-charge-blue'
                            }
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col gap-2 items-center justify-center min-w-72">
                <span className="font-semibold">{status.reference}</span>
                {status.model && (
                  <span className="text-gray-400 text-sm">
                    {status.model.vendor} {status.model.name}
                  </span>
                )}
              </div>

              <div className="flex-1 flex items-center justify-end gap-6">
                {status.connection_status === 'online' &&
                  status?.connectors?.map((connector: Connector) => (
                    <ConnectorStatus
                      key={connector.connector_id}
                      connector={connector}
                      statusColor={getConnectorStatusColor(connector.status)}
                    />
                  ))}
                {status?.connectors?.length > 2 && (
                  <span className="text-xl">+{status.connectors.length - 2}</span>
                )}
                {status.connection_status === 'offline' && (
                  <span className="text-red-400 text-lg">Charger Offline</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
