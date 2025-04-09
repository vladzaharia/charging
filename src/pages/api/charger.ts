import type { APIRoute } from 'astro';
import type { VoltTimeChargerResponse } from '../../types/volttime';
import type { Charger } from '@/types/charger';

export const GET: APIRoute = async () => {
  try {
    const teamId = import.meta.env.VOLTTIME_TEAM_ID;
    const chargerId = import.meta.env.VOLTTIME_CHARGER_ID;
    const apiKey = import.meta.env.VOLTTIME_API_KEY;

    if (!teamId || !apiKey || !chargerId) {
      return new Response(JSON.stringify({ error: 'Missing required configuration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(
      `https://cloud.volttime.com/api/v2/teams/${teamId}/chargers/${chargerId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch charger data' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const voltTimeData: VoltTimeChargerResponse = await response.json();
    
    // Transform to public response format, excluding sensitive information
    const publicData: Charger = {
        name: voltTimeData.data.reference,
        connection_status: voltTimeData.data.connection_status,
        status: voltTimeData.data.status,
        model: {
          vendor: voltTimeData.data.model.vendor,
          name: voltTimeData.data.model.name
        },
        connectors: voltTimeData.data.connectors.map(connector => ({
          connector_id: connector.connector_id,
          status: connector.status,
          type: "j1772",
          max_amperage: connector.max_amperage
        }))
    };
    
    return new Response(JSON.stringify(publicData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
