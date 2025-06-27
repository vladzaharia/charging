/**
 * SteVe REST API Client
 * Handles official REST endpoints for OCPP tags and transactions
 */

import type {
  SteVeConfig,
  OcppTag,
  Transaction,
  OcppTagQuery,
  TransactionQuery,
  OcppTagForm,
} from './types';
import { SteVeError } from './types';

export class SteVeRestClient {
  private readonly baseUrl: string;
  private readonly authKey?: string;

  constructor(config: SteVeConfig) {
    this.baseUrl = `${config.serverUrl}/steve/api/v1`;
    this.authKey = config.authKey;
  }

  /**
   * Make authenticated REST API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'SteVe-Client/1.0',
      ...(options.headers as Record<string, string>),
    };

    // Add API key if available
    if (this.authKey) {
      headers['Authorization'] = `Bearer ${this.authKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new SteVeError(
          `REST API Error: ${response.status} ${response.statusText}`,
          'REST_API_ERROR',
          response.status,
          { url, errorText }
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof SteVeError) {
        throw error;
      }
      throw new SteVeError(
        `REST API Request failed: ${error}`,
        'REST_API_REQUEST_FAILED',
        undefined,
        { url, error }
      );
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(
    params: Record<string, unknown> | OcppTagQuery | TransactionQuery
  ): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // OCPP Tags Management

  /**
   * Get OCPP tags with optional filtering
   */
  async getOcppTags(query: OcppTagQuery = {}): Promise<OcppTag[]> {
    const queryString = this.buildQueryString(query);
    return this.request<OcppTag[]>(`/ocppTags${queryString}`);
  }

  /**
   * Get a specific OCPP tag by primary key
   */
  async getOcppTag(ocppTagPk: number): Promise<OcppTag> {
    return this.request<OcppTag>(`/ocppTags/${ocppTagPk}`);
  }

  /**
   * Create a new OCPP tag
   */
  async createOcppTag(tagForm: OcppTagForm): Promise<OcppTag> {
    return this.request<OcppTag>('/ocppTags', {
      method: 'POST',
      body: JSON.stringify(tagForm),
    });
  }

  /**
   * Update an existing OCPP tag
   */
  async updateOcppTag(ocppTagPk: number, tagForm: OcppTagForm): Promise<OcppTag> {
    return this.request<OcppTag>(`/ocppTags/${ocppTagPk}`, {
      method: 'PUT',
      body: JSON.stringify(tagForm),
    });
  }

  /**
   * Delete an OCPP tag
   */
  async deleteOcppTag(ocppTagPk: number): Promise<void> {
    await this.request<void>(`/ocppTags/${ocppTagPk}`, {
      method: 'DELETE',
    });
  }

  // Transaction Management

  /**
   * Get transactions with optional filtering
   */
  async getTransactions(query: TransactionQuery = {}): Promise<Transaction[]> {
    const queryString = this.buildQueryString(query);
    return this.request<Transaction[]>(`/transactions${queryString}`);
  }

  /**
   * Get active transactions for a specific charge box
   */
  async getActiveTransactions(chargeBoxId: string): Promise<Transaction[]> {
    return this.getTransactions({
      chargeBoxId,
      type: 'ACTIVE',
    });
  }

  /**
   * Get transaction history for a specific charge box
   */
  async getTransactionHistory(
    chargeBoxId: string,
    periodType: TransactionQuery['periodType'] = 'LAST_30'
  ): Promise<Transaction[]> {
    return this.getTransactions({
      chargeBoxId,
      periodType,
      type: 'ALL',
    });
  }

  /**
   * Find active transaction for a specific connector
   */
  async findActiveTransaction(
    chargeBoxId: string,
    connectorId: number
  ): Promise<Transaction | null> {
    const activeTransactions = await this.getActiveTransactions(chargeBoxId);
    return activeTransactions.find((t) => t.connectorId === connectorId) || null;
  }

  /**
   * Get transaction details by ID
   */
  async getTransaction(transactionPk: number): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${transactionPk}`);
  }

  // Utility Methods

  /**
   * Check if REST API is available and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch a small dataset to test connectivity
      await this.getOcppTags({ ocppTagPk: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API version and capabilities
   */
  async getApiInfo(): Promise<{ version: string; capabilities: string[] }> {
    try {
      // This endpoint may not exist in all SteVe versions
      return this.request<{ version: string; capabilities: string[] }>('/info');
    } catch (error) {
      // Fallback to basic info
      return {
        version: '1.0',
        capabilities: ['ocppTags', 'transactions'],
      };
    }
  }

  /**
   * Batch operations for OCPP tags
   */
  async batchCreateOcppTags(tags: OcppTagForm[]): Promise<OcppTag[]> {
    const results: OcppTag[] = [];

    // Process in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < tags.length; i += batchSize) {
      const batch = tags.slice(i, i + batchSize);
      const batchPromises = batch.map((tag) => this.createOcppTag(tag));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        // Continue with remaining batches even if one fails
        console.warn(`Batch ${i / batchSize + 1} failed:`, error);
      }
    }

    return results;
  }

  /**
   * Search OCPP tags by ID pattern
   */
  async searchOcppTags(pattern: string): Promise<OcppTag[]> {
    // Since the REST API doesn't support pattern matching,
    // we'll fetch all tags and filter client-side
    const allTags = await this.getOcppTags();
    const regex = new RegExp(pattern, 'i');

    return allTags.filter((tag) => regex.test(tag.idTag) || (tag.note && regex.test(tag.note)));
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(chargeBoxId?: string): Promise<{
    total: number;
    active: number;
    completed: number;
    averageDuration: number;
    totalEnergy: number;
  }> {
    const query: TransactionQuery = chargeBoxId ? { chargeBoxId } : {};
    const transactions = await this.getTransactions(query);

    const active = transactions.filter((t) => !t.stopEventTimestamp).length;
    const completed = transactions.filter((t) => t.stopEventTimestamp).length;

    const completedTransactions = transactions.filter(
      (t) => t.stopEventTimestamp && t.startEventTimestamp
    );

    const totalDuration = completedTransactions.reduce((sum, t) => {
      const duration = t.stopEventTimestamp!.getTime() - t.startEventTimestamp.getTime();
      return sum + duration;
    }, 0);

    const totalEnergy = completedTransactions.reduce((sum, t) => {
      return sum + ((t.stopValue || 0) - t.startValue);
    }, 0);

    return {
      total: transactions.length,
      active,
      completed,
      averageDuration: completed > 0 ? totalDuration / completed : 0,
      totalEnergy,
    };
  }
}
