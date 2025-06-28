/**
 * Unified SteVe Service
 * Combines REST API and web scraping clients to provide a comprehensive interface
 */

import { SteVeRestClient } from './rest-client';
import { SteVeWebClient } from './web-client';
import { SteVeError } from './types';
import type {
  SteVeConfig,
  ChargePoint,
  Connector,
  OcppTag,
  User,
  Transaction,
  Reservation,
  ChargingProfile,
  SystemStatus,
  ChargePointQuery,
  OcppTagQuery,
  TransactionQuery,
  UserQuery,
  ChargePointForm,
  OcppTagForm,
  UserForm,
  OcppOperationRequest,
  OcppOperationResponse,
  ConnectorStatus,
} from './types';

export class SteVeService {
  private restClient: SteVeRestClient;
  private webClient: SteVeWebClient;
  private config: SteVeConfig;

  constructor(config: SteVeConfig) {
    this.config = config;
    this.restClient = new SteVeRestClient(config);
    this.webClient = new SteVeWebClient(config);
  }

  // Authentication Management

  /**
   * Authenticate with SteVe server
   */
  async authenticate(): Promise<void> {
    await this.webClient.authenticate();
    // REST client now inherits from base client and shares session
    await this.restClient.authenticate();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    const session = this.webClient.getSession();
    return session?.authenticated || false;
  }

  /**
   * Logout and clean up session
   */
  async logout(): Promise<void> {
    await this.webClient.logout();
    await this.restClient.logout();
  }

  // Charge Point Management

  /**
   * Get all charge points with complete information including connectors
   */
  async getChargePoints(query: ChargePointQuery = {}): Promise<ChargePoint[]> {
    const chargePoints = await this.webClient.getChargePoints(query);

    // Enrich with connector information
    const connectors = await this.webClient.getConnectorStatus();

    return chargePoints.map((cp) => ({
      ...cp,
      connectors: connectors.filter((c) => c.chargeBoxId === cp.chargeBoxId),
    }));
  }

  /**
   * Get detailed information about a specific charge point
   */
  async getChargePoint(chargeBoxId: string): Promise<ChargePoint | null> {
    const chargePoint = await this.webClient.getChargePoint(chargeBoxId);
    if (!chargePoint) {
      return null;
    }

    // Add connector information
    const connectors = await this.webClient.getChargePointConnectors(chargeBoxId);

    return {
      ...chargePoint,
      connectors,
    };
  }

  /**
   * Create a new charge point
   */
  async createChargePoint(chargePointData: ChargePointForm): Promise<ChargePoint> {
    return this.webClient.createChargePoint(chargePointData);
  }

  /**
   * Batch create charge points
   */
  async batchCreateChargePoints(chargeBoxIds: string[]): Promise<ChargePoint[]> {
    return this.webClient.batchCreateChargePoints(chargeBoxIds);
  }

  /**
   * Delete a charge point
   */
  async deleteChargePoint(chargeBoxId: string): Promise<void> {
    const chargePoint = await this.getChargePoint(chargeBoxId);
    if (!chargePoint) {
      throw new SteVeError(`Charge point ${chargeBoxId} not found`);
    }

    await this.webClient.deleteChargePoint(chargePoint.chargeBoxPk);
  }

  // Connector Management

  /**
   * Get real-time status of all connectors
   */
  async getConnectorStatus(): Promise<Connector[]> {
    return this.webClient.getConnectorStatus();
  }

  /**
   * Get connectors for a specific charge point
   */
  async getChargePointConnectors(chargeBoxId: string): Promise<Connector[]> {
    return this.webClient.getChargePointConnectors(chargeBoxId);
  }

  /**
   * Get connector status summary
   */
  async getConnectorStatusSummary(): Promise<Record<ConnectorStatus, number>> {
    const connectors = await this.getConnectorStatus();

    const summary: Record<ConnectorStatus, number> = {
      Available: 0,
      Preparing: 0,
      Charging: 0,
      SuspendedEVSE: 0,
      SuspendedEV: 0,
      Finishing: 0,
      Reserved: 0,
      Unavailable: 0,
      Faulted: 0,
    };

    connectors.forEach((connector) => {
      summary[connector.status]++;
    });

    return summary;
  }

  // OCPP Tag Management

  /**
   * Get OCPP tags with hierarchical structure (includes children)
   */
  async getOcppTags(query: OcppTagQuery = {}): Promise<OcppTag[]> {
    try {
      // Try REST API first for better performance
      const tags = await this.restClient.getOcppTags(query);

      // Build hierarchical structure
      return this.buildTagHierarchy(tags);
    } catch (error) {
      // Fallback to web scraping if REST API fails
      console.warn('REST API failed, falling back to web scraping:', error);
      throw new SteVeError('OCPP tag retrieval not available via web interface');
    }
  }

  /**
   * Get a specific OCPP tag with all related information
   */
  async getOcppTag(ocppTagPk: number): Promise<OcppTag | null> {
    try {
      const tag = await this.restClient.getOcppTag(ocppTagPk);

      // Get child tags
      const childTags = await this.restClient.getOcppTags({ parentIdTag: tag.idTag });

      // Get transactions for this tag
      const transactions = await this.restClient.getTransactions({ ocppIdTag: tag.idTag });

      return {
        ...tag,
        children: childTags,
        transactions,
      };
    } catch (error) {
      if (error instanceof SteVeError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new OCPP tag
   */
  async createOcppTag(tagData: OcppTagForm): Promise<OcppTag> {
    return this.restClient.createOcppTag(tagData);
  }

  /**
   * Update an existing OCPP tag
   */
  async updateOcppTag(ocppTagPk: number, tagData: OcppTagForm): Promise<OcppTag> {
    return this.restClient.updateOcppTag(ocppTagPk, tagData);
  }

  /**
   * Delete an OCPP tag
   */
  async deleteOcppTag(ocppTagPk: number): Promise<void> {
    await this.restClient.deleteOcppTag(ocppTagPk);
  }

  /**
   * Search OCPP tags by pattern
   */
  async searchOcppTags(pattern: string): Promise<OcppTag[]> {
    return this.restClient.searchOcppTags(pattern);
  }

  // User Management

  /**
   * Get all users with their associated OCPP tags
   */
  async getUsers(query: UserQuery = {}): Promise<User[]> {
    const users = await this.webClient.getUsers(query);

    // Enrich with OCPP tag information
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          const ocppTag = await this.getOcppTagByIdTag(user.ocppIdTag);
          return {
            ...user,
            ocppTag: ocppTag || undefined,
          };
        } catch (error) {
          // Continue without OCPP tag if not found
          return user;
        }
      })
    );

    return enrichedUsers;
  }

  /**
   * Get detailed information about a specific user
   */
  async getUser(userPk: number): Promise<User | null> {
    const user = await this.webClient.getUser(userPk);
    if (!user) {
      return null;
    }

    // Add OCPP tag information
    try {
      const ocppTag = await this.getOcppTagByIdTag(user.ocppIdTag);
      return {
        ...user,
        ocppTag: ocppTag || undefined,
      };
    } catch (error) {
      return user;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: UserForm): Promise<User> {
    return this.webClient.createUser(userData);
  }

  /**
   * Delete a user
   */
  async deleteUser(userPk: number): Promise<void> {
    await this.webClient.deleteUser(userPk);
  }

  // Transaction Management

  /**
   * Get transactions with enriched information
   */
  async getTransactions(query: TransactionQuery = {}): Promise<Transaction[]> {
    const transactions = await this.restClient.getTransactions(query);

    // Enrich with charge point and user information
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const [chargePoint, user] = await Promise.all([
          this.getChargePoint(transaction.chargeBoxId).catch(() => null),
          this.getUserByOcppIdTag(transaction.ocppIdTag).catch(() => null),
        ]);

        const connector = chargePoint?.connectors.find(
          (c) => c.connectorId === transaction.connectorId
        );

        return {
          ...transaction,
          chargePoint: chargePoint || undefined,
          user: user || undefined,
          connector,
        };
      })
    );

    return enrichedTransactions;
  }

  /**
   * Get active transactions
   */
  async getActiveTransactions(chargeBoxId?: string): Promise<Transaction[]> {
    const query: TransactionQuery = { type: 'ACTIVE' };
    if (chargeBoxId) {
      query.chargeBoxId = chargeBoxId;
    }

    return this.getTransactions(query);
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(chargeBoxId?: string) {
    return this.restClient.getTransactionStats(chargeBoxId);
  }

  // Reservation Management

  /**
   * Get all reservations
   */
  async getReservations(): Promise<Reservation[]> {
    return this.webClient.getReservations();
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationPk: number): Promise<void> {
    await this.webClient.cancelReservation(reservationPk);
  }

  // Charging Profile Management

  /**
   * Get all charging profiles
   */
  async getChargingProfiles(): Promise<ChargingProfile[]> {
    return this.webClient.getChargingProfiles();
  }

  /**
   * Get detailed charging profile information
   */
  async getChargingProfile(chargingProfilePk: number): Promise<ChargingProfile | null> {
    return this.webClient.getChargingProfile(chargingProfilePk);
  }

  /**
   * Delete a charging profile
   */
  async deleteChargingProfile(chargingProfilePk: number): Promise<void> {
    await this.webClient.deleteChargingProfile(chargingProfilePk);
  }

  // System Status

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.webClient.getSystemStatus();
  }

  // OCPP Operations

  /**
   * Reserve a connector
   */
  async reserveNow(
    chargeBoxId: string,
    connectorId: number,
    idTag: string,
    expiry: Date
  ): Promise<OcppOperationResponse> {
    return this.webClient.reserveNow(chargeBoxId, connectorId, idTag, expiry);
  }

  /**
   * Start a charging transaction remotely
   */
  async remoteStartTransaction(
    chargeBoxId: string,
    connectorId: number,
    idTag: string
  ): Promise<OcppOperationResponse> {
    return this.webClient.remoteStartTransaction(chargeBoxId, connectorId, idTag);
  }

  /**
   * Stop a charging transaction remotely
   */
  async remoteStopTransaction(
    chargeBoxId: string,
    transactionId: number
  ): Promise<OcppOperationResponse> {
    return this.webClient.remoteStopTransaction(chargeBoxId, transactionId);
  }

  /**
   * Unlock a connector
   */
  async unlockConnector(chargeBoxId: string, connectorId: number): Promise<OcppOperationResponse> {
    return this.webClient.unlockConnector(chargeBoxId, connectorId);
  }

  /**
   * Reset a charge point
   */
  async resetChargePoint(
    chargeBoxId: string,
    resetType: 'Hard' | 'Soft' = 'Soft'
  ): Promise<OcppOperationResponse> {
    return this.webClient.resetChargePoint(chargeBoxId, resetType);
  }

  /**
   * Execute any OCPP operation
   */
  async executeOcppOperation(
    operation: string,
    version: 'v1.2' | 'v1.5' | 'v1.6',
    request: OcppOperationRequest
  ): Promise<OcppOperationResponse> {
    return this.webClient.executeOcppOperation(operation, version, request);
  }

  // Health Check

  /**
   * Check if SteVe service is healthy and accessible
   */
  async healthCheck(): Promise<{
    authenticated: boolean;
    restApiAvailable: boolean;
    webInterfaceAvailable: boolean;
    overall: boolean;
  }> {
    const authenticated = this.isAuthenticated();

    let restApiAvailable = false;
    try {
      restApiAvailable = await this.restClient.healthCheck();
    } catch (error) {
      // REST API not available
    }

    let webInterfaceAvailable = false;
    try {
      await this.webClient.getSystemStatus();
      webInterfaceAvailable = true;
    } catch (error) {
      // Web interface not available
    }

    return {
      authenticated,
      restApiAvailable,
      webInterfaceAvailable,
      overall: authenticated && (restApiAvailable || webInterfaceAvailable),
    };
  }

  // Private helper methods

  private buildTagHierarchy(tags: OcppTag[]): OcppTag[] {
    const tagMap = new Map<string, OcppTag>();
    const rootTags: OcppTag[] = [];

    // First pass: create map and identify root tags
    tags.forEach((tag) => {
      tagMap.set(tag.idTag, { ...tag, children: [] });
      if (!tag.parentIdTag) {
        rootTags.push(tagMap.get(tag.idTag)!);
      }
    });

    // Second pass: build hierarchy
    tags.forEach((tag) => {
      if (tag.parentIdTag) {
        const parent = tagMap.get(tag.parentIdTag);
        const child = tagMap.get(tag.idTag);
        if (parent && child) {
          parent.children = parent.children || [];
          parent.children.push(child);
        }
      }
    });

    return rootTags;
  }

  private async getOcppTagByIdTag(idTag: string): Promise<OcppTag | null> {
    const tags = await this.restClient.getOcppTags({ idTag });
    return tags.length > 0 ? tags[0] : null;
  }

  private async getUserByOcppIdTag(ocppIdTag: string): Promise<User | null> {
    const users = await this.webClient.getUsers({ ocppIdTag });
    return users.length > 0 ? users[0] : null;
  }
}
