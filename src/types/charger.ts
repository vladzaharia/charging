// Public API types
export interface ChargerModel {
  vendor: string;
  name: string;
}

export type ConnectorStatus =
  | 'Available'
  | 'Preparing'
  | 'Charging'
  | 'Faulted'
  | 'Unavailable'
  | 'Unknown'
  | 'Unregistered'
  | 'Finishing'
  | 'SuspendedEV'
  | 'SuspendedEVSE'
  | 'Paused';

export interface Connector {
  connector_id: number;
  status: ConnectorStatus;
  max_amperage: number;
  type: 'j1772' | 'nacs' | 'ccs1';
}

export type ChargerConnectionStatus = 'online' | 'offline' | 'unknown';
export type ChargerStatus = 'Available' | 'Unavailable' | 'Offline' | 'Unknown';

export interface Charger {
  code: string;
  reference?: string;
  connection_status: ChargerConnectionStatus;
  status: ChargerStatus;
  model: ChargerModel;
  connectors: Connector[];
}
