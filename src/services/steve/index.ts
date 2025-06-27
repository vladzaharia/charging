/**
 * SteVe Service Module
 * Comprehensive TypeScript client for SteVe OCPP Server
 */

// Main service class
export { SteVeService } from './steve-service';

// Individual clients for advanced usage
export { SteVeRestClient } from './rest-client';
export { SteVeWebClient } from './web-client';
export { SteVeBaseClient } from './base-client';

// Error classes (exported as classes, not types)
export { SteVeError, SteVeAuthenticationError, SteVeValidationError } from './types';

// All types
export type {
  // Configuration
  SteVeConfig,
  SteVeSession,

  // Core entities
  ChargePoint,
  Connector,
  OcppTag,
  User,
  Transaction,
  Reservation,
  ChargingProfile,
  Address,

  // Nested types
  ChargingSchedule,
  ChargingSchedulePeriod,
  ConnectorStatus,

  // Query types
  ChargePointQuery,
  OcppTagQuery,
  TransactionQuery,
  UserQuery,

  // Form types
  ChargePointForm,
  OcppTagForm,
  UserForm,

  // OCPP operation types
  OcppOperationRequest,
  OcppOperationResponse,

  // System types
  SystemStatus,
  ConnectorStatusOverview,
  SteVeSettings,

  // API response types
  SteVeApiResponse,
  PaginatedResponse,
} from './types';

// Factory function for easy instantiation
export function createSteVeService(config: {
  serverUrl: string;
  username: string;
  password: string;
  authKey?: string;
}) {
  return new SteVeService(config);
}

// Default export for convenience
import { SteVeService } from './steve-service';
export default SteVeService;
