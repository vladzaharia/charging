import { VoltTimeService, VoltTimeError } from '@/services/volttime';
import { SupabaseService, SupabaseError } from '@/services/supabase';
import type { Connector } from '@/types/charger';
import type { VoltTimeConnector } from '@/types/volttime';
import { NextResponse } from 'next/server';
import { ChargerIdSchema } from '@/middleware/validation/schemas';
import {
  validateParams,
  ValidationError,
  createValidationErrorResponse,
} from '@/middleware/validation/middleware';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validate charger ID parameter
    const { id } = await validateParams(params, ChargerIdSchema);

    // First get the charger from Supabase
    const supabaseService = SupabaseService.getInstance();
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
            ? voltTimeConnector.status === 'SuspendedEVSE' ||
              voltTimeConnector.status === 'SuspendedEV'
              ? 'Paused'
              : voltTimeConnector.status
            : 'Unregistered',
          max_amperage: voltTimeConnector.max_amperage,
          type: supabaseConnector?.connector_type ?? 'Unregistered',
        };
      }
    );

    return NextResponse.json({
      ...data.data,
      code: charger.id,
      connectors: enhancedConnectors,
    });
  } catch (error) {
    console.error('Error fetching charger data:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof VoltTimeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
