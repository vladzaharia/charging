import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters manually to avoid type issues
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') || 'all';
    const tag_id = searchParams.get('tag_id')
      ? parseInt(searchParams.get('tag_id')!, 10)
      : undefined;
    const charger_id = searchParams.get('charger_id');
    const period = searchParams.get('period') || 'all';
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const query = { page, limit, status, tag_id, charger_id, period, start_date, end_date };

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get all transactions with enhanced data from SteVe
    const steveTransactions = await steveService.getTransactions();

    // Get database transactions for billing data
    const dbTransactions = await supabase.getTransactions();

    // Create lookup map for database transactions by steve_transaction_id
    const dbTransactionMap = new Map(dbTransactions.map((tx) => [tx.steve_transaction_id, tx]));

    // Enhance SteVe transactions with database billing data
    const allTransactions = steveTransactions.map((steveTx) => {
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
    let filteredTransactions = allTransactions;

    // Filter by charger_id (using charge box ID from SteVe data)
    if (query.charger_id) {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.chargePoint?.chargeBoxId === query.charger_id
      );
    }

    // Filter by tag_id (OCPP tag primary key)
    if (query.tag_id) {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.ocppTagPk === query.tag_id
      );
    }

    // Filter by status (active = no stopTimestamp, completed = has stopTimestamp)
    if (query.status && query.status !== 'all') {
      if (query.status === 'active') {
        filteredTransactions = filteredTransactions.filter((transaction) => transaction.is_active);
      } else if (query.status === 'completed') {
        filteredTransactions = filteredTransactions.filter((transaction) => !transaction.is_active);
      }
    }

    // Filter by period
    if (query.period && query.period !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      if (query.period === 'last_7') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (query.period === 'last_30') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoffDate = new Date(0); // Include all
      }

      filteredTransactions = filteredTransactions.filter((transaction) => {
        const startDate = new Date(transaction.startEventTimestamp);
        return startDate >= cutoffDate;
      });
    }

    // Filter by custom date range
    if (query.start_date) {
      const startDate = new Date(query.start_date);
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const transactionStart = new Date(transaction.startEventTimestamp);
        return transactionStart >= startDate;
      });
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const transactionStart = new Date(transaction.startEventTimestamp);
        return transactionStart <= endDate;
      });
    }

    // Sort by start timestamp (newest first)
    filteredTransactions.sort(
      (a, b) =>
        new Date(b.startEventTimestamp).getTime() - new Date(a.startEventTimestamp).getTime()
    );

    // Apply pagination
    const totalCount = filteredTransactions.length;
    const offset = (query.page - 1) * query.limit;
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    await steveService.logout();

    // Restructure transactions for better organization
    const structuredTransactions = paginatedTransactions.map((tx) => ({
      // Core transaction data
      transaction: {
        id: tx.database_id || `steve-${tx.transactionPk}`,
        steve_id: tx.transactionPk,
        start_time: tx.startEventTimestamp,
        stop_time: tx.stopEventTimestamp || null,
        status: tx.is_active ? 'active' : 'completed',
      },
      // Billing and energy data
      billing: {
        start_meter_value: tx.billing_start_meter,
        stop_meter_value: tx.billing_stop_meter,
        energy_consumed_wh: tx.energy_consumed_wh,
        duration_minutes: tx.duration_minutes,
      },
      // Charger information
      charger: {
        id: tx.chargePoint?.chargeBoxId || tx.chargeBoxId,
        name: tx.chargePoint?.description || 'Unknown',
        connector_id: tx.connectorId,
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

    return NextResponse.json({
      // Main data
      data: structuredTransactions,
      // Metadata
      meta: {
        count: paginatedTransactions.length,
        total: totalCount,
        filters_applied: {
          charger_id: query.charger_id || null,
          tag_id: query.tag_id || null,
          status: query.status || 'all',
          period: query.period || 'all',
          date_range: {
            start: query.start_date || null,
            end: query.end_date || null,
          },
        },
      },
      // Pagination
      pagination: {
        current_page: query.page,
        per_page: query.limit,
        total_pages: Math.ceil(totalCount / query.limit),
        has_next: query.page < Math.ceil(totalCount / query.limit),
        has_prev: query.page > 1,
      },
      // Legacy format for backward compatibility
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: totalCount,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);

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
