import type { APIRoute } from 'astro';
import { VoltTimeService, VoltTimeError } from '../../../services/volttime';
import { SupabaseService, SupabaseError } from '../../../services/supabase';
import type { Connector } from '../../../types/charger';
import type { VoltTimeConnector } from '../../../types/volttime';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Charger ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // First get the charger from Supabase
    const supabaseService = new SupabaseService();
    const charger = await supabaseService.getChargerById(id.replaceAll('-', ''));

    // Then get the charger details from VoltTime
    const voltTimeService = new VoltTimeService();
    const data = await voltTimeService.getCharger(charger.charger_id);

    // Merge connector data from Supabase with VoltTime data
    const enhancedConnectors: Connector[] = data.data.connectors.map(
      (voltTimeConnector: VoltTimeConnector) => {
        // Find matching Supabase connector by ID
        const supabaseConnector = charger.connectors?.find(
          (c) => c.connector_id === voltTimeConnector.id
        );

        return {
          connector_id: voltTimeConnector.connector_id,
          status: supabaseConnector?.connector_type
            ? voltTimeConnector.status === 'SuspendedEVSE'
              ? 'Paused'
              : voltTimeConnector.status
            : 'Unregistered',
          max_amperage: voltTimeConnector.max_amperage,
          type: supabaseConnector?.connector_type ?? 'Unregistered',
        };
      }
    );

    return new Response(
      JSON.stringify({
        ...data.data,
        code: charger.id,
        connectors: enhancedConnectors,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching charger data:', error);

    if (error instanceof VoltTimeError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error instanceof SupabaseError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
