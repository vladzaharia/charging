import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * GET /api/admin/ocpp/status
 * Get OCPP system status and operation tracking information (Admin Only)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const chargeBoxId = url.searchParams.get('chargeBoxId');

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get system status
    const systemStatus = await steveService.getSystemStatus();

    // Get connector status for all chargers or specific charger
    let connectorStatus;
    if (chargeBoxId) {
      // Verify charger exists
      const { data: charger } = await supabase.client
        .from('chargers')
        .select('id, name, charge_box_id')
        .eq('charge_box_id', chargeBoxId)
        .single();

      if (!charger) {
        await steveService.logout();
        return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
      }

      connectorStatus = await steveService.getChargePointConnectors(chargeBoxId);
    } else {
      connectorStatus = await steveService.getConnectorStatus();
    }

    // Get active transactions
    const activeTransactions = await steveService.getTransactions({ type: 'ACTIVE' });

    // Get database statistics
    const { count: totalChargers } = await supabase.client
      .from('chargers')
      .select('*', { count: 'exact', head: true });

    // Get tag type statistics directly
    const tagStats = await supabase.client
      .from('ocpp_tags')
      .select('tag_type')
      .then(({ data }) => {
        return (data || []).reduce(
          (acc, tag) => {
            acc.total++;
            acc.by_type[tag.tag_type] = (acc.by_type[tag.tag_type] || 0) + 1;
            return acc;
          },
          {
            total: 0,
            by_type: {} as Record<string, number>,
          }
        );
      });

    const { count: totalTransactions } = await supabase.client
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    const { count: activeDbTransactions } = await supabase.client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Analyze connector status
    const connectorStats = connectorStatus.reduce(
      (acc, connector) => {
        acc.total++;
        acc.by_status[connector.status] = (acc.by_status[connector.status] || 0) + 1;

        if (['Available', 'Preparing'].includes(connector.status)) {
          acc.available++;
        } else if (['Charging', 'SuspendedEV', 'SuspendedEVSE'].includes(connector.status)) {
          acc.in_use++;
        } else if (['Faulted', 'Unavailable'].includes(connector.status)) {
          acc.faulted++;
        }

        return acc;
      },
      {
        total: 0,
        available: 0,
        in_use: 0,
        faulted: 0,
        by_status: {} as Record<string, number>,
      }
    );

    await steveService.logout();

    return NextResponse.json({
      // System overview
      system: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        steve_status: systemStatus,
      },

      // Charger and connector status
      chargers: {
        total: totalChargers || 0,
        filter: chargeBoxId ? { chargeBoxId } : null,
      },

      connectors: {
        ...connectorStats,
        details: chargeBoxId ? connectorStatus : undefined,
      },

      // Transaction status
      transactions: {
        total: totalTransactions || 0,
        active_steve: activeTransactions.length,
        active_database: activeDbTransactions || 0,
        steve_transactions: chargeBoxId
          ? activeTransactions.filter((t) => t.chargePoint?.chargeBoxId === chargeBoxId)
          : activeTransactions,
      },

      // Tag status
      tags: tagStats,

      // OCPP operations status
      operations: {
        available: [
          'RemoteStartTransaction',
          'RemoteStopTransaction',
          'ReserveNow',
          'CancelReservation',
          'UnlockConnector',
          'Reset',
          'ChangeConfiguration',
          'GetConfiguration',
          'DataTransfer',
        ],
        endpoint: '/api/admin/ocpp/operations',
      },

      // Health indicators
      health: {
        database_connected: true,
        steve_connected: true,
        connectors_online: connectorStats.total - connectorStats.faulted,
        connectors_total: connectorStats.total,
        active_sessions: activeTransactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching OCPP status:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SteVeError) {
      return NextResponse.json(
        {
          error: error.message,
          system: {
            status: 'degraded',
            steve_connected: false,
            timestamp: new Date().toISOString(),
          },
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        system: {
          status: 'error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
