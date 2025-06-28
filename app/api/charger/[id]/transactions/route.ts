import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * GET /api/charger/[id]/transactions
 * Get transaction history for a specific charger
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Get and validate charger ID
    const { id: chargerId } = await params;
    if (!chargerId) {
      return NextResponse.json({ error: 'Charger ID is required' }, { status: 400 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') || 'all'; // all, active, completed
    const period = searchParams.get('period') || 'all'; // all, today, week, month
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    // Validate pagination parameters
    if (page <= 0 || limit <= 0 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Verify charger exists in database
    const { data: charger } = await supabase.client
      .from('chargers')
      .select('id, name, location, charge_box_id')
      .eq('id', chargerId)
      .single();

    if (!charger) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get all transactions from SteVe
    const steveTransactions = await steveService.getTransactions();

    // Get database transactions for billing data
    const dbTransactions = await supabase.getTransactions();

    // Create lookup map for database transactions by steve_transaction_id
    const dbTransactionMap = new Map(dbTransactions.map((tx) => [tx.steve_transaction_id, tx]));

    // Filter transactions for this charger and enhance with database data
    const chargerTransactions = steveTransactions
      .filter((tx) => tx.chargePoint?.chargeBoxId === charger.charge_box_id)
      .map((steveTx) => {
        const dbTx = dbTransactionMap.get(steveTx.transactionPk);

        return {
          ...steveTx,
          // Add database billing fields if available
          database_id: dbTx?.id || null,
          energy_consumed_wh: dbTx?.energy_consumed_wh || null,
          duration_minutes: dbTx?.duration_minutes || null,
          is_active: dbTx?.is_active ?? (steveTx.stopEventTimestamp ? false : true),
          billing_start_meter: dbTx?.start_meter_value || steveTx.startValue,
          billing_stop_meter: dbTx?.stop_meter_value || steveTx.stopValue,
        };
      });

    // Apply filtering
    let filteredTransactions = chargerTransactions;

    // Filter by status
    if (status !== 'all') {
      if (status === 'active') {
        filteredTransactions = filteredTransactions.filter((tx) => tx.is_active);
      } else if (status === 'completed') {
        filteredTransactions = filteredTransactions.filter((tx) => !tx.is_active);
      }
    }

    // Apply date filtering
    if (start_date || end_date || period !== 'all') {
      if (period !== 'all') {
        const now = new Date();
        let cutoffDate: Date;

        if (period === 'today') {
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (period === 'week') {
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          cutoffDate = new Date(0);
        }

        filteredTransactions = filteredTransactions.filter((tx) => {
          const startDate = new Date(tx.startEventTimestamp);
          return startDate >= cutoffDate;
        });
      }

      if (start_date) {
        const startDate = new Date(start_date);
        filteredTransactions = filteredTransactions.filter((tx) => {
          const transactionStart = new Date(tx.startEventTimestamp);
          return transactionStart >= startDate;
        });
      }

      if (end_date) {
        const endDate = new Date(end_date);
        filteredTransactions = filteredTransactions.filter((tx) => {
          const transactionStart = new Date(tx.startEventTimestamp);
          return transactionStart <= endDate;
        });
      }
    }

    // Sort by start timestamp (newest first)
    filteredTransactions.sort(
      (a, b) =>
        new Date(b.startEventTimestamp).getTime() - new Date(a.startEventTimestamp).getTime()
    );

    // Apply pagination
    const totalCount = filteredTransactions.length;
    const offset = (page - 1) * limit;
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    // Restructure transactions for better organization
    const structuredTransactions = paginatedTransactions.map((tx) => ({
      // Core transaction data
      transaction: {
        id: tx.database_id || `steve-${tx.transactionPk}`,
        steve_id: tx.transactionPk,
        start_time: tx.startEventTimestamp,
        stop_time: tx.stopEventTimestamp || null,
        status: tx.is_active ? 'active' : 'completed',
        stop_reason: tx.stopReason || null,
      },
      // Billing and energy data
      billing: {
        start_meter_value: tx.billing_start_meter,
        stop_meter_value: tx.billing_stop_meter,
        energy_consumed_wh: tx.energy_consumed_wh,
        duration_minutes: tx.duration_minutes,
      },
      // Connector information
      connector: {
        id: tx.connectorId,
        connector_info: tx.connector || null,
      },
      // User/tag information
      user: {
        tag_id: tx.ocppIdTag,
        tag_pk: tx.ocppTagPk,
        user_info: tx.user || null,
      },
      // Legacy fields for backward compatibility
      ...tx,
    }));

    await steveService.logout();

    return NextResponse.json({
      // Charger information
      charger: {
        id: charger.id,
        name: charger.name,
        location: charger.location,
        charge_box_id: charger.charge_box_id,
      },
      // Main transaction data
      data: structuredTransactions,
      // Metadata
      meta: {
        count: paginatedTransactions.length,
        total: totalCount,
        filters_applied: {
          status: status,
          period: period,
          date_range: {
            start: start_date || null,
            end: end_date || null,
          },
        },
      },
      // Pagination
      pagination: {
        current_page: page,
        per_page: limit,
        total_pages: Math.ceil(totalCount / limit),
        has_next: page < Math.ceil(totalCount / limit),
        has_prev: page > 1,
      },
      // Legacy format for backward compatibility
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: totalCount,
    });
  } catch (error) {
    console.error('Error fetching charger transactions:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SteVeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
