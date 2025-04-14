import type { VoltTimeChargerResponse } from '../types/volttime';

export class VoltTimeError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'VoltTimeError';
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
