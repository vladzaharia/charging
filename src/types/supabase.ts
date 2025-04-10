export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      chargers: {
        Row: {
          id: string;
          charger_uuid: string;
          charger_id: string;
          site_uuid: string;
          site_id: number;
          is_hidden: boolean;
          is_default: boolean;
        };
        Insert: {
          id?: string;
          charger_uuid: string;
          charger_id: string;
          site_uuid: string;
          site_id: number;
          is_hidden?: boolean;
          is_default?: boolean;
        };
        Update: {
          id?: string;
          charger_uuid?: string;
          charger_id?: string;
          site_uuid?: string;
          site_id?: number;
          is_hidden?: boolean;
          is_default?: boolean;
        };
      };
      connectors: {
        Row: {
          id: string;
          charger_id: string;
          connector_id: number;
          connector_idx: number;
          connector_type: 'j1772' | 'ccs1' | 'nacs';
        };
        Insert: {
          id?: string;
          charger_id: string;
          connector_id: number;
          connector_idx: number;
          connector_type: 'j1772' | 'ccs1' | 'nacs';
        };
        Update: {
          id?: string;
          charger_id?: string;
          connector_id?: number;
          connector_idx?: number;
          connector_type?: 'j1772' | 'ccs1' | 'nacs';
        };
      };
    };
    Views: {
      visible_connectors: {
        Row: {
          id: string;
          charger_id: string;
          connector_id: number;
          connector_idx: number;
          connector_type: 'j1772' | 'ccs1' | 'nacs';
          charger_uuid: string;
          parent_charger_id: string;
          site_uuid: string;
          site_id: number;
          is_hidden: boolean;
          is_default: boolean;
        };
      };
    };
    Functions: {
      get_charger_with_connectors: {
        Args: {
          charger_id_param: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      connector_type: 'j1772' | 'ccs1' | 'nacs';
    };
  };
}
