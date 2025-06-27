/**
 * Comprehensive TypeScript types for SteVe OCPP Server
 * Based on detailed analysis of SteVe web interface and REST API
 */

// Base Configuration
export interface SteVeConfig {
  serverUrl: string;
  username: string;
  password: string;
  authKey?: string;
}

// Session Management
export interface SteVeSession {
  cookies: string[];
  csrfToken?: string;
  authenticated: boolean;
  lastActivity: Date;
  expiresAt?: Date;
}

// Error Types
export class SteVeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SteVeError';
  }
}

export class SteVeAuthenticationError extends SteVeError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'SteVeAuthenticationError';
  }
}

export class SteVeValidationError extends SteVeError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'SteVeValidationError';
  }
}

// Charge Point Types
export interface ChargePoint {
  chargeBoxId: string;
  chargeBoxPk: number;
  description?: string;
  ocppProtocol: 'ocpp1.2' | 'ocpp1.5' | 'ocpp1.6';
  registrationStatus: 'Accepted' | 'Rejected';
  lastHeartbeat?: Date;
  address?: Address;
  connectors: Connector[];
  adminAddress?: string;
  note?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  insertConnectorStatusAfterTransactionMsg: boolean;
}

export interface Address {
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}

export interface Connector {
  connectorId: number;
  connectorPk?: number;
  chargeBoxId: string;
  status: ConnectorStatus;
  errorCode?: string;
  errorInfo?: string;
  vendorId?: string;
  vendorErrorCode?: string;
  lastStatusUpdate?: Date;
}

export type ConnectorStatus =
  | 'Available'
  | 'Preparing'
  | 'Charging'
  | 'SuspendedEVSE'
  | 'SuspendedEV'
  | 'Finishing'
  | 'Reserved'
  | 'Unavailable'
  | 'Faulted';

// OCPP Tag Types
export interface OcppTag {
  ocppTagPk: number;
  idTag: string;
  parentIdTag?: string;
  parentOcppTagPk?: number;
  expiryDate?: Date;
  maxActiveTransactionCount?: number;
  note?: string;
  blocked: boolean;
  inTransaction: boolean;
  activeTransactionCount: number;
  children?: OcppTag[];
  transactions?: Transaction[];
}

// User Types
export interface User {
  userPk: number;
  ocppIdTag: string;
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
  sex?: 'M' | 'F';
  birthDay?: Date;
  address?: Address;
  ocppTag?: OcppTag;
}

// Transaction Types
export interface Transaction {
  transactionPk: number;
  connectorId: number;
  chargeBoxId: string;
  chargeBoxPk: number;
  ocppIdTag: string;
  ocppTagPk: number;
  startEventTimestamp: Date;
  startValue: number;
  stopEventTimestamp?: Date;
  stopValue?: number;
  stopReason?: string;
  stopEventActor?: 'manual' | 'station';
  user?: User;
  chargePoint?: ChargePoint;
  connector?: Connector;
}

// Reservation Types
export interface Reservation {
  reservationPk: number;
  connectorId: number;
  chargeBoxId: string;
  chargeBoxPk: number;
  ocppIdTag: string;
  ocppTagPk: number;
  startDatetime: Date;
  expiryDatetime: Date;
  status: 'Waiting' | 'Active' | 'Cancelled' | 'Expired';
  user?: User;
  chargePoint?: ChargePoint;
  connector?: Connector;
}

// Charging Profile Types
export interface ChargingProfile {
  chargingProfilePk: number;
  stackLevel: number;
  chargingProfilePurpose: 'ChargePointMaxProfile' | 'TxDefaultProfile' | 'TxProfile';
  chargingProfileKind: 'Absolute' | 'Recurring' | 'Relative';
  recurrencyKind?: 'Daily' | 'Weekly';
  validFrom?: Date;
  validTo?: Date;
  chargingSchedule: ChargingSchedule;
  description?: string;
}

export interface ChargingSchedule {
  duration?: number;
  startSchedule?: Date;
  chargingRateUnit: 'W' | 'A';
  chargingSchedulePeriod: ChargingSchedulePeriod[];
  minChargingRate?: number;
}

export interface ChargingSchedulePeriod {
  startPeriod: number;
  limit: number;
  numberPhases?: number;
}

// OCPP Operation Types
export interface OcppOperationRequest {
  chargeBoxId: string;
  connectorId?: number;
  transactionId?: number;
  idTag?: string;
  expiry?: Date;
  vendorId?: string;
  messageId?: string;
  data?: string;
  resetType?: 'Hard' | 'Soft';
  chargingProfileId?: number;
  type?: 'Inoperative' | 'Operative';
  key?: string;
  value?: string;
  retrieveDate?: Date;
  retries?: number;
  retryInterval?: number;
  location?: string;
}

export interface OcppOperationResponse {
  success: boolean;
  status?: string;
  message?: string;
  timestamp: Date;
}

// Query Parameters
export interface ChargePointQuery {
  chargeBoxId?: string;
  description?: string;
  ocppVersion?: 'All' | 'ocpp1.2' | 'ocpp1.5' | 'ocpp1.6';
  heartbeatPeriod?: 'All' | 'Today' | 'Yesterday' | 'Earlier';
}

export interface OcppTagQuery {
  blocked?: 'All' | 'FALSE' | 'TRUE';
  expired?: 'All' | 'FALSE' | 'TRUE';
  idTag?: string;
  inTransaction?: 'All' | 'FALSE' | 'TRUE';
  ocppTagPk?: number;
  parentIdTag?: string;
}

export interface TransactionQuery {
  chargeBoxId?: string;
  ocppIdTag?: string;
  type?: 'ALL' | 'ACTIVE';
  periodType?: 'ALL' | 'TODAY' | 'LAST_30' | 'LAST_90' | 'CUSTOM';
  from?: Date;
  to?: Date;
}

export interface UserQuery {
  ocppIdTag?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Form Data Types
export interface ChargePointForm {
  chargeBoxId: string;
  description?: string;
  note?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  adminAddress?: string;
  address?: Partial<Address>;
  registrationStatus: 'Accepted' | 'Rejected';
  insertConnectorStatusAfterTransactionMsg: boolean;
}

export interface OcppTagForm {
  idTag: string;
  parentIdTag?: string;
  expiryDate?: Date;
  maxActiveTransactionCount?: number;
  note?: string;
  blocked?: boolean;
}

export interface UserForm {
  ocppIdTag: string;
  name?: string;
  phone?: string;
  email?: string;
  note?: string;
  sex?: 'M' | 'F';
  birthDay?: Date;
  address?: Partial<Address>;
}

// API Response Types
export interface SteVeApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Settings Types
export interface SteVeSettings {
  heartbeatIntervalInSeconds: number;
  hoursToKeepLogsInDb: number;
  autoRegisterUnknownStations: boolean;
  autoRegisterUnknownTags: boolean;
  mailEnabled: boolean;
  mailHost?: string;
  mailUsername?: string;
  mailPassword?: string;
  mailFrom?: string;
  mailProtocol?: 'smtp' | 'smtps';
  mailPort?: number;
}

// Status Types
export interface ConnectorStatusOverview {
  available: number;
  preparing: number;
  charging: number;
  suspendedEVSE: number;
  suspendedEV: number;
  finishing: number;
  reserved: number;
  unavailable: number;
  faulted: number;
}

export interface SystemStatus {
  connectorStatus: ConnectorStatusOverview;
  chargePointCount: number;
  ocppTagCount: number;
  userCount: number;
  activeTransactionCount: number;
  activeReservationCount: number;
  connectedChargePoints: {
    ocpp12: number;
    ocpp15: number;
    ocpp16: number;
  };
  heartbeatsReceived: {
    today: number;
    yesterday: number;
    earlier: number;
  };
}
