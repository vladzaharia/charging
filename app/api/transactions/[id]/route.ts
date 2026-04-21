import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get and validate transaction ID parameter
    const { id: idString } = await params;
    const transactionId = parseInt(idString, 10);

    if (isNaN(transactionId) || transactionId <= 0) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get all transactions and find the specific one
    // Note: SteVe doesn't have a direct endpoint for individual transactions
    const allTransactions = await steveService.getTransactions();
    const steveTransaction = allTransactions.find((t) => t.transactionPk === transactionId);

    if (!steveTransaction) {
      await steveService.logout();
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get database transaction for billing data
    const dbTransaction = await supabase
      .getTransactions()
      .then((transactions) =>
        transactions.find((tx) => tx.steve_transaction_id === steveTransaction.transactionPk)
      );

    // Enhance SteVe transaction with database billing data
    const enhancedTransaction = {
      ...steveTransaction,
      // Add database billing fields if available
      database_id: dbTransaction?.id || null,
      energy_consumed_wh: dbTransaction?.energy_consumed_wh || null,
      duration_minutes: dbTransaction?.duration_minutes || null,
      is_active: dbTransaction?.is_active ?? (steveTransaction.stopEventTimestamp ? false : true),
      billing_start_meter: dbTransaction?.start_meter_value || steveTransaction.startValue,
      billing_stop_meter: dbTransaction?.stop_meter_value || steveTransaction.stopValue,
    };

    await steveService.logout();

    // Restructure transaction for better organization
    const structuredTransaction = {
      // Core transaction data
      transaction: {
        id: enhancedTransaction.database_id || `steve-${enhancedTransaction.transactionPk}`,
        steve_id: enhancedTransaction.transactionPk,
        start_time: enhancedTransaction.startEventTimestamp,
        stop_time: enhancedTransaction.stopEventTimestamp || null,
        status: enhancedTransaction.is_active ? 'active' : 'completed',
        stop_reason: enhancedTransaction.stopReason || null,
      },
      // Billing and energy data
      billing: {
        start_meter_value: enhancedTransaction.billing_start_meter,
        stop_meter_value: enhancedTransaction.billing_stop_meter,
        energy_consumed_wh: enhancedTransaction.energy_consumed_wh,
        duration_minutes: enhancedTransaction.duration_minutes,
      },
      // Charger information
      charger: {
        id: enhancedTransaction.chargePoint?.chargeBoxId || enhancedTransaction.chargeBoxId,
        name: enhancedTransaction.chargePoint?.description || 'Unknown',
        connector_id: enhancedTransaction.connectorId,
        connector_info: enhancedTransaction.connector || null,
      },
      // User/tag information
      user: {
        tag_id: enhancedTransaction.ocppIdTag,
        tag_pk: enhancedTransaction.ocppTagPk,
        user_info: enhancedTransaction.user || null,
      },
      // Legacy format for backward compatibility
      ...enhancedTransaction,
    };

    return NextResponse.json(structuredTransaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);

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

/**
 * PATCH /api/transactions/[id]/stop
 * Stop a transaction via RemoteStopTransaction
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: transactionId } = await params;
    const body = await request.json();

    // Check if this is a stop request
    if (body.action !== 'stop') {
      return NextResponse.json({ error: 'Only "stop" action is supported' }, { status: 400 });
    }

    // Try to find transaction in database first (private ID)
    let dbTransaction = null;
    let steveTransactionId = null;

    const { data: dbTx } = await supabase.client
      .from('transactions')
      .select(
        `
        *,
        chargers!inner(*),
        connectors!inner(*),
        ocpp_tags!inner(*)
      `
      )
      .eq('id', transactionId)
      .single();

    if (dbTx) {
      dbTransaction = dbTx;
      steveTransactionId = dbTx.steve_transaction_id;
    } else {
      // Try parsing as SteVe transaction ID
      const numericId = parseInt(transactionId, 10);
      if (!isNaN(numericId)) {
        steveTransactionId = numericId;

        // Try to find in database by steve_transaction_id
        const { data: dbTxBySteveId } = await supabase.client
          .from('transactions')
          .select(
            `
            *,
            chargers!inner(*),
            connectors!inner(*),
            ocpp_tags!inner(*)
          `
          )
          .eq('steve_transaction_id', numericId)
          .single();

        if (dbTxBySteveId) {
          dbTransaction = dbTxBySteveId;
        }
      }
    }

    if (!steveTransactionId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Check if transaction is already stopped
    if (dbTransaction && !dbTransaction.is_active) {
      return NextResponse.json({ error: 'Transaction is already stopped' }, { status: 409 });
    }

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get charger information for the stop command
    let chargeBoxId;
    if (dbTransaction) {
      chargeBoxId = dbTransaction.chargers.charge_box_id;
    } else {
      // Get transaction from SteVe to find charger
      const allTransactions = await steveService.getTransactions();
      const steveTransaction = allTransactions.find((t) => t.transactionPk === steveTransactionId);

      if (!steveTransaction) {
        await steveService.logout();
        return NextResponse.json({ error: 'Transaction not found in SteVe' }, { status: 404 });
      }

      chargeBoxId = steveTransaction.chargePoint?.chargeBoxId;
      if (!chargeBoxId) {
        await steveService.logout();
        return NextResponse.json({ error: 'Charger information not available' }, { status: 503 });
      }
    }

    // Execute RemoteStopTransaction
    const result = await steveService.remoteStopTransaction(chargeBoxId, steveTransactionId);

    await steveService.logout();

    return NextResponse.json({
      message: 'Transaction stop request sent successfully',
      transaction: {
        id: dbTransaction?.id || `steve-${steveTransactionId}`,
        steve_id: steveTransactionId,
        database_record: !!dbTransaction,
      },
      charger: {
        charge_box_id: chargeBoxId,
        name: dbTransaction?.chargers?.name || null,
      },
      ocpp_result: result,
      timestamp: new Date().toISOString(),
      note: 'Transaction will be marked as stopped once the charger confirms the stop',
    });
  } catch (error) {
    console.error('Error stopping transaction:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SteVeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
