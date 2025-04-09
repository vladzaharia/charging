import { useChargerStatus } from '../../hooks/useChargerStatus';
import type { Connector, ConnectorStatus as ConnectorStatusType } from '../../types/charger';
import { ConnectorStatus } from './ConnectorStatus';
import { statusColors } from '../../utils/colors';
import type { ColorSet } from '../../utils/colors';

const getConnectorStatusColor = (status: ConnectorStatusType): ColorSet => {
  switch (status) {
    case 'Available':
      return statusColors.green;
    case 'Preparing':
      return statusColors.yellow;
    case 'Charging':
      return statusColors.blue;
    case 'Faulted':
    case 'Unavailable':
      return statusColors.red;
    default:
      return statusColors.slate;
  }
};

const getGlobalStatus = (connectors: Connector[] = [], isOnline: boolean): ColorSet => {
  if (!isOnline) return statusColors.red;
  
  const statuses = new Set(connectors.map(c => c.status));
  
  // If all connectors are unavailable or faulted
  if (connectors.length > 0 && connectors.every(c => c.status === 'Unavailable' || c.status === 'Faulted')) {
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

export const ChargerStatusBar = () => {
  const { status, error, loading } = useChargerStatus();

  const globalStatus = status 
    ? getGlobalStatus(status.connectors, status.connection_status === 'online')
    : statusColors.slate;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4">
      <div className={`bg-slate-900/10 border-2 rounded-xl backdrop-blur backdrop-opacity-85 drop-shadow-lg ${globalStatus.border}`}>
        <div className={`container mx-auto p-4 ${error ? 'text-red-400' : 'text-white'}`}>
          {loading && (
            <div className="text-center">
              Loading charger status...
            </div>
          )}

          {error && (
            <div className="text-center">
              Error loading charger status: {error}
            </div>
          )}

          {status && (
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex flex-col items-center justify-center min-w-72">
                <span className="font-semibold">{status.name}</span>
                {status.model && <span className="text-gray-400 text-sm">{status.model.vendor}</span>}
                {status.model && <span className="text-gray-400 text-sm">{status.model.name}</span>}
              </div>
              <div className="flex items-center gap-6">
                {status.connectors.map((connector) => (
                  <ConnectorStatus
                    key={connector.connector_id}
                    connector={connector}
                    statusColor={getConnectorStatusColor(connector.status)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
