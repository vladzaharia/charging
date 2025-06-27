// Public API types
export interface ChargerModel {
  vendor: string;
  name: string;
}

// OCPP 1.6 Connector Status Enumeration
export type ConnectorStatus =
  // Operational states
  | 'Available' // Ready for use
  | 'Preparing' // Getting ready to charge
  | 'Charging' // Actively charging
  | 'SuspendedEVSE' // Suspended by charging station
  | 'SuspendedEV' // Suspended by electric vehicle
  | 'Finishing' // Completing charging session
  | 'Reserved' // Reserved for specific user
  // Non-operational states
  | 'Unavailable' // Not available for use
  | 'Faulted' // Error state
  // Legacy/custom states (for backward compatibility)
  | 'Unknown' // Status unknown
  | 'Unregistered' // Not registered in system
  | 'Paused'; // Legacy alias for SuspendedEVSE/SuspendedEV

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
