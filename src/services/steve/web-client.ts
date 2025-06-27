/**
 * SteVe Web Scraping Client
 * Handles operations not available in REST API through web interface scraping
 */

import * as cheerio from 'cheerio';
import { SteVeBaseClient } from './base-client';
import type {
  SteVeConfig,
  ChargePoint,
  Connector,
  User,
  Reservation,
  ChargingProfile,
  OcppOperationRequest,
  OcppOperationResponse,
  ChargePointForm,
  UserForm,
  ChargePointQuery,
  UserQuery,
  SystemStatus,
  ConnectorStatus,
} from './types';
import { SteVeError } from './types';

export class SteVeWebClient extends SteVeBaseClient {
  constructor(config: SteVeConfig) {
    super(config);
  }

  // Charge Point Management

  /**
   * Get all charge points with optional filtering
   */
  async getChargePoints(query: ChargePointQuery = {}): Promise<ChargePoint[]> {
    const url = `${this.config.serverUrl}/steve/manager/chargepoints`;
    const $ = await this.fetchHtml(url);

    // Submit query form if filters provided
    if (Object.keys(query).length > 0) {
      const response = await this.submitForm('/steve/manager/chargepoints/query', query, 'GET');
      const html = await response.text();
      const $filtered = cheerio.load(html);
      return this.parseChargePointsTable($filtered);
    }

    return this.parseChargePointsTable($);
  }

  /**
   * Get detailed information about a specific charge point
   */
  async getChargePoint(chargeBoxId: string): Promise<ChargePoint | null> {
    // First get the charge point PK from the main list
    const chargePoints = await this.getChargePoints({ chargeBoxId });
    const chargePoint = chargePoints.find((cp) => cp.chargeBoxId === chargeBoxId);

    if (!chargePoint) {
      return null;
    }

    // Get detailed information from details page
    const detailsUrl = `${this.config.serverUrl}/steve/manager/chargepoints/details/${chargePoint.chargeBoxPk}`;
    const $ = await this.fetchHtml(detailsUrl);

    return this.parseChargePointDetails($, chargePoint);
  }

  /**
   * Create a new charge point
   */
  async createChargePoint(chargePointData: ChargePointForm): Promise<ChargePoint> {
    const response = await this.submitForm(
      '/steve/manager/chargepoints/add/single',
      chargePointData
    );

    // Check if creation was successful
    if (response.status === 302 || response.ok) {
      // Fetch the newly created charge point
      const created = await this.getChargePoint(chargePointData.chargeBoxId);
      if (created) {
        return created;
      }
    }

    throw new SteVeError('Failed to create charge point');
  }

  /**
   * Batch create charge points
   */
  async batchCreateChargePoints(chargeBoxIds: string[]): Promise<ChargePoint[]> {
    const idList = chargeBoxIds.join('\n');

    await this.submitForm('/steve/manager/chargepoints/add/batch', {
      idList,
    });

    // Fetch all created charge points
    const results: ChargePoint[] = [];
    for (const id of chargeBoxIds) {
      const chargePoint = await this.getChargePoint(id);
      if (chargePoint) {
        results.push(chargePoint);
      }
    }

    return results;
  }

  /**
   * Delete a charge point
   */
  async deleteChargePoint(chargeBoxPk: number): Promise<void> {
    await this.submitForm(`/steve/manager/chargepoints/delete/${chargeBoxPk}`, {}, 'POST');
  }

  // Connector Status Management

  /**
   * Get real-time connector status for all charge points
   */
  async getConnectorStatus(): Promise<Connector[]> {
    const url = `${this.config.serverUrl}/steve/manager/home/connectorStatus`;
    const $ = await this.fetchHtml(url);

    return this.parseConnectorStatusTable($);
  }

  /**
   * Get connector status for a specific charge point
   */
  async getChargePointConnectors(chargeBoxId: string): Promise<Connector[]> {
    const allConnectors = await this.getConnectorStatus();
    return allConnectors.filter((c) => c.chargeBoxId === chargeBoxId);
  }

  // User Management

  /**
   * Get all users with optional filtering
   */
  async getUsers(query: UserQuery = {}): Promise<User[]> {
    const url = `${this.config.serverUrl}/steve/manager/users`;
    const $ = await this.fetchHtml(url);

    // Submit query form if filters provided
    if (Object.keys(query).length > 0) {
      const response = await this.submitForm('/steve/manager/users/query', query, 'GET');
      const html = await response.text();
      const $filtered = cheerio.load(html);
      return this.parseUsersTable($filtered);
    }

    return this.parseUsersTable($);
  }

  /**
   * Get detailed information about a specific user
   */
  async getUser(userPk: number): Promise<User | null> {
    const detailsUrl = `${this.config.serverUrl}/steve/manager/users/details/${userPk}`;

    try {
      const $ = await this.fetchHtml(detailsUrl);
      return this.parseUserDetails($);
    } catch (error) {
      if (error instanceof SteVeError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: UserForm): Promise<User> {
    await this.submitForm('/steve/manager/users/add', userData);

    // Find the newly created user by OCPP ID tag
    const users = await this.getUsers({ ocppIdTag: userData.ocppIdTag });
    const created = users.find((u) => u.ocppIdTag === userData.ocppIdTag);

    if (!created) {
      throw new SteVeError('Failed to create user');
    }

    return created;
  }

  /**
   * Delete a user
   */
  async deleteUser(userPk: number): Promise<void> {
    await this.submitForm(`/steve/manager/users/delete/${userPk}`, {}, 'POST');
  }

  // Reservation Management

  /**
   * Get all reservations
   */
  async getReservations(): Promise<Reservation[]> {
    const url = `${this.config.serverUrl}/steve/manager/reservations`;
    const $ = await this.fetchHtml(url);

    return this.parseReservationsTable($);
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationPk: number): Promise<void> {
    await this.submitForm(`/steve/manager/reservations/delete/${reservationPk}`, {}, 'POST');
  }

  // Charging Profile Management

  /**
   * Get all charging profiles
   */
  async getChargingProfiles(): Promise<ChargingProfile[]> {
    const url = `${this.config.serverUrl}/steve/manager/chargingProfiles`;
    const $ = await this.fetchHtml(url);

    return this.parseChargingProfilesTable($);
  }

  /**
   * Get detailed charging profile information
   */
  async getChargingProfile(chargingProfilePk: number): Promise<ChargingProfile | null> {
    const detailsUrl = `${this.config.serverUrl}/steve/manager/chargingProfiles/details/${chargingProfilePk}`;

    try {
      const $ = await this.fetchHtml(detailsUrl);
      return this.parseChargingProfileDetails($);
    } catch (error) {
      if (error instanceof SteVeError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a charging profile
   */
  async deleteChargingProfile(chargingProfilePk: number): Promise<void> {
    await this.submitForm(
      `/steve/manager/chargingProfiles/delete/${chargingProfilePk}`,
      {},
      'POST'
    );
  }

  // System Status

  /**
   * Get system overview and statistics
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const url = `${this.config.serverUrl}/steve/manager/home`;
    const $ = await this.fetchHtml(url);

    return this.parseSystemStatus($);
  }

  // OCPP Operations

  /**
   * Execute OCPP operation
   */
  async executeOcppOperation(
    operation: string,
    version: 'v1.2' | 'v1.5' | 'v1.6',
    request: OcppOperationRequest
  ): Promise<OcppOperationResponse> {
    const operationUrl = `/steve/manager/operations/${version}/${operation}`;

    try {
      const response = await this.submitForm(operationUrl, request);

      // Parse response to determine success
      const html = await response.text();
      const $ = cheerio.load(html);

      // Look for success/error indicators
      const hasError = $('.error, .alert-danger').length > 0;
      const successMessage = $('.success, .alert-success').text().trim();

      return {
        success: !hasError,
        status: hasError ? 'Error' : 'Success',
        message: hasError ? $('.error, .alert-danger').text().trim() : successMessage,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        status: 'Error',
        message: `Operation failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  // Convenience methods for common OCPP operations

  async reserveNow(
    chargeBoxId: string,
    connectorId: number,
    idTag: string,
    expiry: Date
  ): Promise<OcppOperationResponse> {
    return this.executeOcppOperation('ReserveNow', 'v1.6', {
      chargeBoxId,
      connectorId,
      idTag,
      expiry,
    });
  }

  async remoteStartTransaction(
    chargeBoxId: string,
    connectorId: number,
    idTag: string
  ): Promise<OcppOperationResponse> {
    return this.executeOcppOperation('RemoteStartTransaction', 'v1.6', {
      chargeBoxId,
      connectorId,
      idTag,
    });
  }

  async remoteStopTransaction(
    chargeBoxId: string,
    transactionId: number
  ): Promise<OcppOperationResponse> {
    return this.executeOcppOperation('RemoteStopTransaction', 'v1.6', {
      chargeBoxId,
      transactionId,
    });
  }

  async unlockConnector(chargeBoxId: string, connectorId: number): Promise<OcppOperationResponse> {
    return this.executeOcppOperation('UnlockConnector', 'v1.6', {
      chargeBoxId,
      connectorId,
    });
  }

  async resetChargePoint(
    chargeBoxId: string,
    resetType: 'Hard' | 'Soft' = 'Soft'
  ): Promise<OcppOperationResponse> {
    return this.executeOcppOperation('Reset', 'v1.6', {
      chargeBoxId,
      resetType,
    });
  }

  // Private parsing methods

  private parseChargePointsTable($: cheerio.CheerioAPI): ChargePoint[] {
    const chargePointsMap = new Map<string, Record<string, unknown>>();

    // Find all tables that contain "ChargeBox ID" and merge their data
    const $tables = $('table:contains("ChargeBox ID")');

    $tables.each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      // Skip tables that don't have ChargeBox ID as a proper column
      if (!headers.includes('ChargeBox ID')) {
        return;
      }

      // Parse this table's data
      const tableSelector = `table:eq(${$('table').index($table)})`;
      const tableData = this.parseTable($, tableSelector);

      // Merge data for each charge point
      tableData.forEach((row) => {
        if (row['ChargeBox ID']) {
          const chargeBoxIdData = row['ChargeBox ID'];
          const chargeBoxId =
            typeof chargeBoxIdData === 'object' && chargeBoxIdData && 'text' in chargeBoxIdData
              ? (chargeBoxIdData as { text: string; href?: string }).text
              : String(chargeBoxIdData);

          // Get or create the merged data for this charge point
          const existingData = chargePointsMap.get(chargeBoxId) || {};

          // Merge all columns from this table
          const mergedData = { ...existingData, ...row };
          chargePointsMap.set(chargeBoxId, mergedData);
        }
      });
    });

    // Convert merged data to ChargePoint objects
    const chargePoints: ChargePoint[] = [];

    chargePointsMap.forEach((mergedRow, chargeBoxId) => {
      const chargeBoxIdData = mergedRow['ChargeBox ID'];
      const href =
        typeof chargeBoxIdData === 'object' && chargeBoxIdData && 'href' in chargeBoxIdData
          ? (chargeBoxIdData as { text: string; href?: string }).href
          : undefined;

      const chargePoint: ChargePoint = {
        chargeBoxId,
        chargeBoxPk: this.extractIdFromHref(href),
        description: String(mergedRow['Description'] || ''),
        ocppProtocol: this.parseOcppProtocol(String(mergedRow['OCPP Protocol'] || '')),
        registrationStatus: this.parseRegistrationStatus(
          String(mergedRow['Registration Status'] || mergedRow['Status'] || '')
        ),
        lastHeartbeat:
          this.parseDate(String(mergedRow['Last Heartbeat'] || mergedRow['Last Seen'] || '')) ||
          undefined,
        connectors: [], // Will be populated separately
        insertConnectorStatusAfterTransactionMsg: false, // Default
      };

      // Add any additional fields from merged data (as optional properties)
      const extendedChargePoint = chargePoint as ChargePoint & {
        attemptCount?: number;
        lastAttempt?: Date;
        vendor?: string;
        model?: string;
        serialNumber?: string;
      };

      if (mergedRow['# of Attempts']) {
        extendedChargePoint.attemptCount = parseInt(String(mergedRow['# of Attempts'])) || 0;
      }
      if (mergedRow['Last Attempt']) {
        extendedChargePoint.lastAttempt =
          this.parseDate(String(mergedRow['Last Attempt'])) || undefined;
      }
      if (mergedRow['Vendor']) {
        extendedChargePoint.vendor = String(mergedRow['Vendor']);
      }
      if (mergedRow['Model']) {
        extendedChargePoint.model = String(mergedRow['Model']);
      }
      if (mergedRow['Serial Number']) {
        extendedChargePoint.serialNumber = String(mergedRow['Serial Number']);
      }

      chargePoints.push(chargePoint);
    });

    return chargePoints;
  }

  private parseChargePointDetails(
    $: cheerio.CheerioAPI,
    baseChargePoint: ChargePoint
  ): ChargePoint {
    // Parse detailed information from the details page
    const formData = this.parseForm($);

    return {
      ...baseChargePoint,
      description: String(formData.description || baseChargePoint.description),
      note: formData.note ? String(formData.note) : undefined,
      adminAddress: formData.adminAddress ? String(formData.adminAddress) : undefined,
      locationLatitude: formData.locationLatitude
        ? parseFloat(String(formData.locationLatitude))
        : undefined,
      locationLongitude: formData.locationLongitude
        ? parseFloat(String(formData.locationLongitude))
        : undefined,
      insertConnectorStatusAfterTransactionMsg: Boolean(
        formData.insertConnectorStatusAfterTransactionMsg
      ),
      address: {
        street: formData['address.street'] ? String(formData['address.street']) : undefined,
        houseNumber: formData['address.houseNumber']
          ? String(formData['address.houseNumber'])
          : undefined,
        zipCode: formData['address.zipCode'] ? String(formData['address.zipCode']) : undefined,
        city: formData['address.city'] ? String(formData['address.city']) : undefined,
        country: formData['address.country'] ? String(formData['address.country']) : undefined,
      },
    };
  }

  private parseConnectorStatusTable($: cheerio.CheerioAPI): Connector[] {
    const connectorsMap = new Map<string, Record<string, unknown>>();

    // Find all tables that contain connector information and merge their data
    const $tables = $('table');

    $tables.each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      // Skip tables that don't have both ChargeBox ID and Connector ID columns
      if (!headers.includes('ChargeBox ID') || !headers.includes('Connector ID')) {
        return;
      }

      // Parse this table's data
      const tableSelector = `table:eq(${$('table').index($table)})`;
      const tableData = this.parseTable($, tableSelector);

      // Merge data for each connector
      tableData.forEach((row) => {
        if (row['ChargeBox ID'] && row['Connector ID']) {
          // Extract chargeBoxId from object or string
          const chargeBoxIdData = row['ChargeBox ID'];
          const chargeBoxId =
            typeof chargeBoxIdData === 'object' && chargeBoxIdData && 'text' in chargeBoxIdData
              ? (chargeBoxIdData as { text: string; href?: string }).text
              : String(chargeBoxIdData);

          const connectorId = String(row['Connector ID']);
          const connectorKey = `${chargeBoxId}-${connectorId}`;

          // Get or create the merged data for this connector
          const existingData = connectorsMap.get(connectorKey) || {};

          // Merge all columns from this table
          const mergedData = { ...existingData, ...row };
          connectorsMap.set(connectorKey, mergedData);
        }
      });
    });

    // Convert merged data to Connector objects
    const connectors: Connector[] = [];

    connectorsMap.forEach((mergedRow) => {
      // Extract chargeBoxId from object or string
      const chargeBoxIdData = mergedRow['ChargeBox ID'];
      const chargeBoxId =
        typeof chargeBoxIdData === 'object' && chargeBoxIdData && 'text' in chargeBoxIdData
          ? (chargeBoxIdData as { text: string; href?: string }).text
          : String(chargeBoxIdData);

      const connector: Connector = {
        connectorId: parseInt(String(mergedRow['Connector ID'])) || 0,
        chargeBoxId,
        status: this.parseConnectorStatus(String(mergedRow['Status'] || '')),
        errorCode: mergedRow['Error Code'] ? String(mergedRow['Error Code']) : undefined,
        errorInfo: mergedRow['Error Info'] ? String(mergedRow['Error Info']) : undefined,
        vendorId: mergedRow['Vendor ID'] ? String(mergedRow['Vendor ID']) : undefined,
        vendorErrorCode: mergedRow['Vendor Error Code']
          ? String(mergedRow['Vendor Error Code'])
          : undefined,
        lastStatusUpdate:
          this.parseDate(
            String(
              mergedRow['Status Timestamp'] ||
                mergedRow['Last Update'] ||
                mergedRow['Date/Time'] ||
                ''
            )
          ) || undefined,
      };

      // Add any additional fields from merged data
      const extendedConnector = connector as Connector & {
        power?: number;
        energy?: number;
        transactionId?: number;
      };

      if (mergedRow['Power']) {
        extendedConnector.power = parseFloat(String(mergedRow['Power'])) || 0;
      }
      if (mergedRow['Energy']) {
        extendedConnector.energy = parseFloat(String(mergedRow['Energy'])) || 0;
      }
      if (mergedRow['Transaction ID']) {
        extendedConnector.transactionId =
          parseInt(String(mergedRow['Transaction ID'])) || undefined;
      }

      connectors.push(connector);
    });

    return connectors;
  }

  private parseUsersTable($: cheerio.CheerioAPI): User[] {
    const usersMap = new Map<string, Record<string, unknown>>();

    // Find all tables that contain user information and merge their data
    const $tables = $(
      'table:contains("OCPP ID Tag"), table:contains("User"), table:contains("Tag")'
    );

    $tables.each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      // Skip tables that don't have OCPP ID Tag column
      if (!headers.includes('OCPP ID Tag')) {
        return;
      }

      // Parse this table's data
      const tableSelector = `table:eq(${$('table').index($table)})`;
      const tableData = this.parseTable($, tableSelector);

      // Merge data for each user
      tableData.forEach((row) => {
        if (row['OCPP ID Tag']) {
          const ocppIdTagData = row['OCPP ID Tag'];
          const ocppIdTag =
            typeof ocppIdTagData === 'object' && ocppIdTagData && 'text' in ocppIdTagData
              ? (ocppIdTagData as { text: string; href?: string }).text
              : String(ocppIdTagData);

          // Get or create the merged data for this user
          const existingData = usersMap.get(ocppIdTag) || {};

          // Merge all columns from this table
          const mergedData = { ...existingData, ...row };
          usersMap.set(ocppIdTag, mergedData);
        }
      });
    });

    // Convert merged data to User objects
    const users: User[] = [];

    usersMap.forEach((mergedRow, ocppIdTag) => {
      const ocppIdTagData = mergedRow['OCPP ID Tag'];
      const href =
        typeof ocppIdTagData === 'object' && ocppIdTagData && 'href' in ocppIdTagData
          ? (ocppIdTagData as { text: string; href?: string }).href
          : undefined;

      const user: User = {
        userPk: this.extractIdFromHref(href) || 0,
        ocppIdTag,
        name: mergedRow['Name'] ? String(mergedRow['Name']) : undefined,
        phone: mergedRow['Phone'] ? String(mergedRow['Phone']) : undefined,
        email: mergedRow['E-Mail'] ? String(mergedRow['E-Mail']) : undefined,
      };

      // Add any additional fields from merged data
      const extendedUser = user as User & {
        status?: string;
        parentTag?: string;
        expiryDate?: Date;
        maxActiveTransactionCount?: number;
      };

      if (mergedRow['Status']) {
        extendedUser.status = String(mergedRow['Status']);
      }
      if (mergedRow['Parent Tag']) {
        extendedUser.parentTag = String(mergedRow['Parent Tag']);
      }
      if (mergedRow['Expiry Date']) {
        extendedUser.expiryDate = this.parseDate(String(mergedRow['Expiry Date'])) || undefined;
      }
      if (mergedRow['Max Active Transaction Count']) {
        extendedUser.maxActiveTransactionCount =
          parseInt(String(mergedRow['Max Active Transaction Count'])) || 1;
      }

      users.push(user);
    });

    return users;
  }

  private parseUserDetails($: cheerio.CheerioAPI): User {
    const formData = this.parseForm($);

    return {
      userPk: 0, // Will be set from URL or context
      ocppIdTag: String(formData.ocppIdTag || ''),
      name: formData.name ? String(formData.name) : undefined,
      phone: formData.phone ? String(formData.phone) : undefined,
      email: formData.email ? String(formData.email) : undefined,
      note: formData.note ? String(formData.note) : undefined,
      sex: formData.sex ? (String(formData.sex) as 'M' | 'F') : undefined,
      birthDay: formData.birthDay
        ? this.parseDate(String(formData.birthDay)) || undefined
        : undefined,
      address: {
        street: formData['address.street'] ? String(formData['address.street']) : undefined,
        houseNumber: formData['address.houseNumber']
          ? String(formData['address.houseNumber'])
          : undefined,
        zipCode: formData['address.zipCode'] ? String(formData['address.zipCode']) : undefined,
        city: formData['address.city'] ? String(formData['address.city']) : undefined,
        country: formData['address.country'] ? String(formData['address.country']) : undefined,
      },
    };
  }

  private parseReservationsTable($: cheerio.CheerioAPI): Reservation[] {
    const reservationsMap = new Map<string, Record<string, unknown>>();

    // Find all tables that contain reservation information and merge their data
    const $tables = $(
      'table:contains("Reservation"), table:contains("ChargeBox ID"), table:contains("Connector")'
    );

    $tables.each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      // Skip tables that don't have reservation-related columns
      if (!headers.some((h) => h.includes('Reservation') || h.includes('ChargeBox ID'))) {
        return;
      }

      // Parse this table's data
      const tableSelector = `table:eq(${$('table').index($table)})`;
      const tableData = this.parseTable($, tableSelector);

      // Merge data for each reservation
      tableData.forEach((row) => {
        // Use reservation ID or a combination of fields as key
        const reservationId =
          row['Reservation ID'] ||
          row['ID'] ||
          `${row['ChargeBox ID']}-${row['Connector ID']}-${row['Start Datetime']}`;

        if (reservationId) {
          // Get or create the merged data for this reservation
          const existingData = reservationsMap.get(String(reservationId)) || {};

          // Merge all columns from this table
          const mergedData = { ...existingData, ...row };
          reservationsMap.set(String(reservationId), mergedData);
        }
      });
    });

    // Convert merged data to Reservation objects
    const reservations: Reservation[] = [];

    reservationsMap.forEach((mergedRow) => {
      // Only process rows that have essential reservation data
      if (!mergedRow['ChargeBox ID'] && !mergedRow['OCPP ID Tag']) {
        return;
      }

      const reservation: Reservation = {
        reservationPk: parseInt(String(mergedRow['Reservation ID'] || mergedRow['ID'] || 0)),
        chargeBoxId: String(mergedRow['ChargeBox ID'] || ''),
        chargeBoxPk: parseInt(String(mergedRow['ChargeBox PK'] || 0)),
        connectorId: parseInt(String(mergedRow['Connector ID'] || 0)),
        ocppIdTag: String(mergedRow['OCPP ID Tag'] || ''),
        ocppTagPk: parseInt(String(mergedRow['OCPP Tag PK'] || 0)),
        startDatetime: this.parseDate(String(mergedRow['Start Datetime'] || '')) || new Date(),
        expiryDatetime: this.parseDate(String(mergedRow['Expiry Datetime'] || '')) || new Date(),
        status: this.parseReservationStatus(String(mergedRow['Status'] || '')),
      };

      // Add any additional fields from merged data
      const extendedReservation = reservation as Reservation & {
        userName?: string;
        duration?: string;
      };

      if (mergedRow['User']) {
        extendedReservation.userName = String(mergedRow['User']);
      }
      if (mergedRow['Duration']) {
        extendedReservation.duration = String(mergedRow['Duration']);
      }

      reservations.push(reservation);
    });

    return reservations;
  }

  private parseChargingProfilesTable($: cheerio.CheerioAPI): ChargingProfile[] {
    const profilesMap = new Map<string, Record<string, unknown>>();

    // Find all tables that contain charging profile information and merge their data
    const $tables = $(
      'table:contains("Charging Profile"), table:contains("Profile"), table:contains("Stack Level")'
    );

    $tables.each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];
      $table.find('thead th, tr:first-child th').each((_, th) => {
        headers.push($(th).text().trim());
      });

      // Skip tables that don't have charging profile-related columns
      if (!headers.some((h) => h.includes('Profile') || h.includes('Stack Level'))) {
        return;
      }

      // Parse this table's data
      const tableSelector = `table:eq(${$('table').index($table)})`;
      const tableData = this.parseTable($, tableSelector);

      // Merge data for each charging profile
      tableData.forEach((row) => {
        // Use profile ID or a combination of fields as key
        const profileId =
          row['Charging Profile ID'] ||
          row['Profile ID'] ||
          row['ID'] ||
          `${row['Stack Level']}-${row['Purpose']}-${row['Kind']}`;

        if (profileId) {
          // Get or create the merged data for this profile
          const existingData = profilesMap.get(String(profileId)) || {};

          // Merge all columns from this table
          const mergedData = { ...existingData, ...row };
          profilesMap.set(String(profileId), mergedData);
        }
      });
    });

    // Convert merged data to ChargingProfile objects
    const profiles: ChargingProfile[] = [];

    profilesMap.forEach((mergedRow) => {
      // Only process rows that have essential charging profile data
      if (!mergedRow['Stack Level'] && !mergedRow['Purpose']) {
        return;
      }

      const profile: ChargingProfile = {
        chargingProfilePk: parseInt(
          String(
            mergedRow['Charging Profile ID'] || mergedRow['Profile ID'] || mergedRow['ID'] || 0
          )
        ),
        stackLevel: parseInt(String(mergedRow['Stack Level'] || 0)),
        chargingProfilePurpose: this.parseChargingProfilePurpose(
          String(mergedRow['Purpose'] || '')
        ),
        chargingProfileKind: this.parseChargingProfileKind(String(mergedRow['Kind'] || '')),
        recurrencyKind: this.parseRecurrencyKind(String(mergedRow['Recurrency Kind'] || '')),
        validFrom: this.parseDate(String(mergedRow['Valid From'] || '')) || undefined,
        validTo: this.parseDate(String(mergedRow['Valid To'] || '')) || undefined,
        chargingSchedule: {
          duration: parseInt(String(mergedRow['Duration'] || 0)),
          startSchedule: this.parseDate(String(mergedRow['Start Schedule'] || '')) || undefined,
          chargingRateUnit: 'W', // Default, would need to be parsed
          chargingSchedulePeriod: [], // Would need to be parsed from detailed view
        },
      };

      // Add any additional fields from merged data
      const extendedProfile = profile as ChargingProfile & {
        description?: string;
        chargeBoxId?: string;
      };

      if (mergedRow['Description']) {
        extendedProfile.description = String(mergedRow['Description']);
      }
      if (mergedRow['ChargeBox ID']) {
        extendedProfile.chargeBoxId = String(mergedRow['ChargeBox ID']);
      }

      profiles.push(profile);
    });

    return profiles;
  }

  private parseChargingProfileDetails($: cheerio.CheerioAPI): ChargingProfile {
    // Implementation would parse charging profile details
    void $; // TODO: Implement when needed
    return {} as ChargingProfile;
  }

  private parseSystemStatus($: cheerio.CheerioAPI): SystemStatus {
    // Parse dashboard statistics
    const chargePointCount = this.extractNumberFromText($('a[href*="chargepoints"]').text());
    const ocppTagCount = this.extractNumberFromText($('a[href*="ocppTags"]').text());
    const userCount = this.extractNumberFromText($('a[href*="users"]').text());
    const activeTransactionCount = this.extractNumberFromText($('a[href*="transactions"]').text());
    const activeReservationCount = this.extractNumberFromText($('a[href*="reservations"]').text());

    return {
      chargePointCount: chargePointCount || 0,
      ocppTagCount: ocppTagCount || 0,
      userCount: userCount || 0,
      activeTransactionCount: activeTransactionCount || 0,
      activeReservationCount: activeReservationCount || 0,
      connectorStatus: {
        available: 0,
        preparing: 0,
        charging: 0,
        suspendedEVSE: 0,
        suspendedEV: 0,
        finishing: 0,
        reserved: 0,
        unavailable: 0,
        faulted: 0,
      },
      connectedChargePoints: {
        ocpp12: 0,
        ocpp15: 0,
        ocpp16: 0,
      },
      heartbeatsReceived: {
        today: 0,
        yesterday: 0,
        earlier: 0,
      },
    };
  }

  // Utility methods

  private extractIdFromHref(href?: string): number {
    if (!href) return 0;
    const match = href.match(/\/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  private parseRegistrationStatus(status: string): 'Accepted' | 'Rejected' {
    const normalizedStatus = status.toLowerCase().trim();
    if (normalizedStatus.includes('reject')) return 'Rejected';
    return 'Accepted'; // Default for accepted, pending, or unknown statuses
  }

  private parseReservationStatus(status: string): 'Waiting' | 'Active' | 'Cancelled' | 'Expired' {
    const normalizedStatus = status.toLowerCase().trim();
    if (normalizedStatus.includes('active')) return 'Active';
    if (normalizedStatus.includes('cancel')) return 'Cancelled';
    if (normalizedStatus.includes('expired')) return 'Expired';
    return 'Waiting'; // Default
  }

  private parseChargingProfilePurpose(
    purpose: string
  ): 'ChargePointMaxProfile' | 'TxDefaultProfile' | 'TxProfile' {
    const normalizedPurpose = purpose.toLowerCase().trim();
    if (normalizedPurpose.includes('chargepoint') || normalizedPurpose.includes('max'))
      return 'ChargePointMaxProfile';
    if (normalizedPurpose.includes('txdefault') || normalizedPurpose.includes('default'))
      return 'TxDefaultProfile';
    if (normalizedPurpose.includes('tx') || normalizedPurpose.includes('transaction'))
      return 'TxProfile';
    return 'TxDefaultProfile'; // Default
  }

  private parseChargingProfileKind(kind: string): 'Absolute' | 'Recurring' | 'Relative' {
    const normalizedKind = kind.toLowerCase().trim();
    if (normalizedKind.includes('absolute')) return 'Absolute';
    if (normalizedKind.includes('recurring')) return 'Recurring';
    if (normalizedKind.includes('relative')) return 'Relative';
    return 'Absolute'; // Default
  }

  private parseRecurrencyKind(recurrency: string): 'Daily' | 'Weekly' | undefined {
    const normalizedRecurrency = recurrency.toLowerCase().trim();
    if (normalizedRecurrency.includes('daily')) return 'Daily';
    if (normalizedRecurrency.includes('weekly')) return 'Weekly';
    return undefined;
  }

  private parseOcppProtocol(protocol: string): 'ocpp1.2' | 'ocpp1.5' | 'ocpp1.6' {
    if (protocol?.includes('1.2')) return 'ocpp1.2';
    if (protocol?.includes('1.5')) return 'ocpp1.5';
    return 'ocpp1.6'; // Default
  }

  private parseConnectorStatus(status: string): ConnectorStatus {
    const statusMap: Record<string, ConnectorStatus> = {
      Available: 'Available',
      Preparing: 'Preparing',
      Charging: 'Charging',
      SuspendedEVSE: 'SuspendedEVSE',
      SuspendedEV: 'SuspendedEV',
      Finishing: 'Finishing',
      Reserved: 'Reserved',
      Unavailable: 'Unavailable',
      Faulted: 'Faulted',
    };

    return statusMap[status] || 'Unavailable';
  }

  private extractNumberFromText(text: string): number | null {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
}
