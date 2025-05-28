import type { VoltTimeChargerResponse } from '../types/volttime';

/**
 * Enhanced VoltTime error class with metadata support
 */
export class VoltTimeError extends Error {
  public readonly metadata: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category:
      | 'authentication'
      | 'authorization'
      | 'validation'
      | 'network'
      | 'server'
      | 'client'
      | 'external';
    correlationId?: string;
    timestamp: Date;
    context?: Record<string, unknown>;
    retryable: boolean;
    userMessage: string;
  };

  constructor(
    message: string,
    public status: number,
    public response?: Response,
    metadata: Partial<typeof VoltTimeError.prototype.metadata> = {}
  ) {
    super(message);
    this.name = 'VoltTimeError';

    // Determine retryability and severity based on status code
    const isRetryable = status >= 500 || status === 429;
    const severity = status >= 500 ? 'high' : status === 404 ? 'low' : 'medium';

    this.metadata = {
      severity,
      category: 'external',
      timestamp: new Date(),
      retryable: isRetryable,
      userMessage: this.getDefaultUserMessage(status),
      context: { statusCode: status, response: response?.url },
      ...metadata,
    };
  }

  private getDefaultUserMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid charger request. Please check the charger ID.';
      case 401:
        return 'Authentication required for charger service.';
      case 403:
        return 'Access denied to charger service.';
      case 404:
        return 'Charger not found in the charging network.';
      case 429:
        return 'Too many charger requests. Please wait a moment.';
      case 500:
        return 'Charging service temporarily unavailable.';
      default:
        return 'Charger service error occurred. Please try again.';
    }
  }
}

export class VoltTimeService {
  private readonly baseUrl = 'https://cloud.volttime.com/api/v2';
  private readonly teamId: string;
  private readonly apiKey: string;

  constructor() {
    const teamId = process.env.VOLTTIME_TEAM_ID;
    const apiKey = process.env.VOLTTIME_API_KEY;

    if (!teamId || !apiKey) {
      throw new Error('Missing required VoltTime configuration');
    }

    this.teamId = teamId;
    this.apiKey = apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new VoltTimeError('Failed to fetch data from VoltTime API', response.status, response);
    }

    return response.json() as Promise<T>;
  }

  async getCharger(chargerId: string): Promise<VoltTimeChargerResponse> {
    if (!chargerId) {
      throw new Error('Charger ID is required');
    }

    return this.fetch<VoltTimeChargerResponse>(`/teams/${this.teamId}/chargers/${chargerId}`);
  }
}
