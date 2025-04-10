import type { Charger, Connector } from './charger';

// Internal types for VoltTime API
export interface VoltTimeConnector extends Connector {
  id: number;
  charger_id: number;
  error: string | 'NoError';
  error_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoltTimeChargerInternal extends Charger {
  uuid: string;
  id: number;
  identity: string;
  reference: string;
  error: string | 'NoError';
  error_info: string | null;
  created_at: string;
  updated_at: string;
  connectors: VoltTimeConnector[];
}

export interface VoltTimeResponse<T> {
  data: T;
}

export type VoltTimeChargerResponse = VoltTimeResponse<
  {
    deprecation?: string;
  } & VoltTimeChargerInternal
>;
