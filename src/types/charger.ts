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
  | 'Unknown';

export interface Connector {
  connector_id: number;
  status: ConnectorStatus;
  max_amperage: number;
  type: 'j1772' | 'nacs' | 'ccs1';
}

export type ChargerConnectionStatus = 'online' | 'offline' | 'unknown';
export type ChargerStatus = 'Available' | 'Unavailable' | 'Offline' | 'Unknown';

export interface Charger {
  reference?: string;
  connection_status: ChargerConnectionStatus;
  status: ChargerStatus;
  model: ChargerModel;
  connectors: Connector[];
}
