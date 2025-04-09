import type { Connector } from '../../types/charger';
import { ConnectorIcon } from './ConnectorIcon';

interface ConnectorStatusProps {
  connector: Connector;
  statusColor: {
    bg: string;
    border: string;
    fill: string;
  };
}

export const ConnectorStatus = ({ connector, statusColor }: ConnectorStatusProps) => {
  return (
    <div className="flex flex-col justify-center gap-4 items-center space-x-2">
      <ConnectorIcon
        connector={connector}
        className={`w-12 h-12 ${statusColor.fill}`}
      />
      <span className={`px-2 py-1 rounded ${statusColor.bg} text-slate-900`}>
        {connector.status}
      </span>
    </div>
  );
};
