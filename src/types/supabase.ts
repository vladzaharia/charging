export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Enums first for forward reference
export const enum ConnectorType {
  J1772 = 'j1772',
  CCS1 = 'ccs1',
  NACS = 'nacs',
}

export const enum PermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  MANAGER = 'manager',
}

export const enum UserStatus {
  UNVERIFIED = 'unverified',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

// Core utility types
type Timestamps = Readonly<{
  created_at: string;
  updated_at: string;
}>;

type Entity<T = Record<string, never>> = Readonly<{
  id: string;
}> &
  T &
  Timestamps;

// Generic table operations
type TableInsert<T> = Omit<T, keyof Timestamps | 'id'> & { id?: string };
type TableUpdate<T> = Partial<Omit<T, 'id' | keyof Timestamps>>;

// Table schemas with computed Insert/Update types
type ChargerRow = Entity<{
  charger_uuid: string;
  charger_id: number;
  site_uuid: string;
  site_id: number;
  is_hidden: boolean;
}>;

type ConnectorRow = Entity<{
  charger_id: string;
  connector_id: number;
  connector_idx: number;
  connector_type: ConnectorType;
}>;

type ProfileRow = Entity<{
  supabase_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: UserStatus;
  last_sign_in: string | null;
}>;

type PermissionRow = Entity<{
  supabase_id: string;
  role: string;
  created_by: string | null;
}>;

// Table definition helper
type Table<TRow> = {
  Row: TRow;
  Insert: TableInsert<TRow>;
  Update: TableUpdate<TRow>;
};

// Specialized table types where needed
type ChargerTable = Table<ChargerRow> & {
  Insert: TableInsert<ChargerRow> & {
    is_hidden?: boolean; // Override to make optional
  };
};

type ProfileTable = Table<ProfileRow> & {
  Insert: TableInsert<ProfileRow> & {
    country?: string; // Override to make optional
    status?: UserStatus; // Override to make optional
  };
  Update: Omit<TableUpdate<ProfileRow>, 'supabase_id'>; // supabase_id should not be updatable
};

export interface Database {
  public: {
    Tables: {
      chargers: ChargerTable;
      connectors: Table<ConnectorRow>;
      profiles: ProfileTable;
      permissions: Table<PermissionRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      connector_type: ConnectorType;
      permission_level: PermissionLevel;
      user_status: UserStatus;
    };
  };
}
