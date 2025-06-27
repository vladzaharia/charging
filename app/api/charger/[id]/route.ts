import { SteVeService, SteVeError, type Connector as SteVeConnector } from '@/services/steve';
import { SupabaseService, SupabaseError } from '@/services/supabase';
import type { Connector } from '@/types/charger';
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

    // Then get the charger details from SteVe
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
    });

    await steveService.authenticate();
    const chargePoint = await steveService.getChargePoint(charger.charge_box_id);

    if (!chargePoint) {
      return NextResponse.json({ error: 'Charge point not found' }, { status: 404 });
    }

    // Also fetch real-time connector status from SteVe
    const steveConnectors = await steveService.getChargePointConnectors(charger.charge_box_id);

    // Merge connector data from Supabase with real-time SteVe data
    // Use real-time connector status as the primary source, fall back to chargePoint.connectors
    const allSteveConnectors =
      steveConnectors.length > 0 ? steveConnectors : chargePoint.connectors;

    const enhancedConnectors: Connector[] = allSteveConnectors.map(
      (steveConnector: SteVeConnector) => {
        // Find matching Supabase connector by connector_idx
        const supabaseConnector = charger.connectors?.find(
          (c) => c.connector_idx === steveConnector.connectorId
        );

        // Map status to valid ConnectorStatus (OCPP 1.6 compliant)
        let status: Connector['status'] = 'Unknown';
        if (supabaseConnector?.connector_type) {
          // Map all valid OCPP 1.6 statuses directly
          const validOcppStatuses = [
            'Available',
            'Preparing',
            'Charging',
            'SuspendedEVSE',
            'SuspendedEV',
            'Finishing',
            'Reserved',
            'Unavailable',
            'Faulted',
          ];

          if (validOcppStatuses.includes(steveConnector.status)) {
            status = steveConnector.status as Connector['status'];
          } else {
            status = 'Unknown';
          }
        } else {
          status = 'Unregistered';
        }

        return {
          connector_id: steveConnector.connectorId,
          status,
          max_amperage: supabaseConnector?.max_amperage || 32,
          type: supabaseConnector?.connector_type ?? 'j1772',
        };
      }
    );

    // Determine connection status based on heartbeat and connector activity
    const getConnectionStatus = (): 'online' | 'offline' => {
      // Check if any connectors are in active states (indicating the charger is online)
      // Based on OCPP 1.6 specification: operational states indicate online charger
      const activeConnectorStates = [
        'Available', // Ready for use
        'Preparing', // Getting ready to charge
        'Charging', // Actively charging
        'SuspendedEVSE', // Suspended by charging station
        'SuspendedEV', // Suspended by electric vehicle
        'Finishing', // Completing charging session
        'Reserved', // Reserved for specific user
        'Paused', // Legacy alias for suspended states
      ];
      const hasActiveConnectors = enhancedConnectors.some((connector) =>
        activeConnectorStates.includes(connector.status)
      );

      // If connectors are active, charger must be online
      if (hasActiveConnectors) {
        return 'online';
      }

      // If no active connectors, check heartbeat recency
      if (chargePoint.lastHeartbeat) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        return chargePoint.lastHeartbeat > twelveHoursAgo ? 'online' : 'offline';
      }

      // No heartbeat data available
      return 'offline';
    };

    return NextResponse.json({
      code: charger.id,
      reference: chargePoint.description,
      connection_status: getConnectionStatus(),
      status: chargePoint.registrationStatus === 'Accepted' ? 'Available' : 'Unavailable',
      model: {
        vendor: 'Unknown',
        name: chargePoint.description || 'Unknown',
      },
      connectors: enhancedConnectors,
    });
  } catch (error) {
    console.error('Error fetching charger data:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SteVeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
