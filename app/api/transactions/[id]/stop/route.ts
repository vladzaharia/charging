import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * POST /api/transactions/[id]/stop
 * Stop a transaction via RemoteStopTransaction
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: transactionId } = await params;

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
      return NextResponse.json(
        {
          error: 'Transaction is already stopped',
          transaction: {
            id: dbTransaction.id,
            steve_id: dbTransaction.steve_transaction_id,
            stop_time: dbTransaction.stop_timestamp,
          },
        },
        { status: 409 }
      );
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
        current_status: dbTransaction?.is_active ? 'active' : 'stopped',
      },
      charger: {
        id: dbTransaction?.chargers?.id || null,
        name: dbTransaction?.chargers?.name || null,
        charge_box_id: chargeBoxId,
      },
      connector: dbTransaction
        ? {
            id: dbTransaction.connectors.id,
            connector_idx: dbTransaction.connectors.connector_idx,
            connector_type: dbTransaction.connectors.connector_type,
          }
        : null,
      tag: dbTransaction
        ? {
            id: dbTransaction.ocpp_tags.id_tag,
            type: dbTransaction.ocpp_tags.tag_type,
          }
        : null,
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
