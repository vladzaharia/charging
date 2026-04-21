import { SteVeService, SteVeError } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * Validation rule types
 */
interface ValidationRule {
  type: 'string' | 'number' | 'array' | 'object';
  required: boolean;
  min?: number;
  max?: number;
  enum?: string[];
}

/**
 * Validation schemas for OCPP operations
 */
const OPERATION_SCHEMAS: Record<string, Record<string, ValidationRule>> = {
  RemoteStartTransaction: {
    chargerId: { type: 'string', required: true },
    connectorId: { type: 'number', required: true, min: 1 },
    idTag: { type: 'string', required: true },
    chargingProfile: { type: 'object', required: false },
  },
  RemoteStopTransaction: {
    chargerId: { type: 'string', required: true },
    transactionId: { type: 'number', required: true, min: 1 },
  },
  ReserveNow: {
    chargerId: { type: 'string', required: true },
    connectorId: { type: 'number', required: true, min: 1 },
    idTag: { type: 'string', required: true },
    expiry: { type: 'string', required: true },
    reservationId: { type: 'number', required: false },
  },
  CancelReservation: {
    chargerId: { type: 'string', required: true },
    reservationId: { type: 'number', required: true },
  },
  UnlockConnector: {
    chargerId: { type: 'string', required: true },
    connectorId: { type: 'number', required: true, min: 1 },
  },
  Reset: {
    chargerId: { type: 'string', required: true },
    resetType: { type: 'string', required: true, enum: ['Hard', 'Soft'] },
  },
  ChangeConfiguration: {
    chargerId: { type: 'string', required: true },
    key: { type: 'string', required: true },
    value: { type: 'string', required: true },
  },
  GetConfiguration: {
    chargerId: { type: 'string', required: true },
    key: { type: 'array', required: false },
  },
  DataTransfer: {
    chargerId: { type: 'string', required: true },
    vendorId: { type: 'string', required: true },
    messageId: { type: 'string', required: false },
    data: { type: 'string', required: false },
  },
  ClearCache: {
    chargerId: { type: 'string', required: true },
  },
  UpdateFirmware: {
    chargerId: { type: 'string', required: true },
    location: { type: 'string', required: true },
    retrieveDate: { type: 'string', required: true },
    retries: { type: 'number', required: false },
    retryInterval: { type: 'number', required: false },
  },
  SendLocalList: {
    chargerId: { type: 'string', required: true },
    listVersion: { type: 'number', required: true },
    updateType: { type: 'string', required: true, enum: ['Full', 'Differential'] },
    localAuthorizationList: { type: 'array', required: false },
  },
  GetLocalListVersion: {
    chargerId: { type: 'string', required: true },
  },
  TriggerMessage: {
    chargerId: { type: 'string', required: true },
    requestedMessage: { type: 'string', required: true },
    connectorId: { type: 'number', required: false },
  },
};

/**
 * Validate operation parameters
 */
function validateOperationParams(operation: string, params: Record<string, unknown>): string[] {
  const schema = OPERATION_SCHEMAS[operation as keyof typeof OPERATION_SCHEMAS];
  if (!schema) {
    return [`Unknown operation: ${operation}`];
  }

  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
    } else if (rules.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    } else if (rules.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key} must be an array`);
    } else if (rules.type === 'object' && typeof value !== 'object') {
      errors.push(`${key} must be an object`);
    }

    // Range validation for numbers
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
    }

    // Enum validation
    if (rules.enum && typeof value === 'string' && !rules.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  return errors;
}

/**
 * GET /api/admin/ocpp/operations/[operation]
 * Get information about a specific OCPP operation (Admin Only)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operation: string }> }
) {
  try {
    const { operation } = await params;

    const schema = OPERATION_SCHEMAS[operation as keyof typeof OPERATION_SCHEMAS];
    if (!schema) {
      return NextResponse.json({ error: 'Unknown OCPP operation' }, { status: 404 });
    }

    return NextResponse.json({
      operation: operation,
      schema: schema,
      description: `Execute ${operation} OCPP command`,
      method: 'POST',
      example_request: {
        method: 'POST',
        url: `/api/admin/ocpp/operations/${operation}`,
        body: Object.keys(schema).reduce(
          (acc, key) => {
            const rules = schema[key];
            if (rules.required) {
              if (rules.type === 'string') {
                if (key === 'chargerId') {
                  acc[key] = 'ABC12345'; // Example nanoid charger ID
                } else {
                  acc[key] = 'example_value';
                }
              } else if (rules.type === 'number') acc[key] = 1;
              else if (rules.type === 'array') acc[key] = [];
              else if (rules.type === 'object') acc[key] = {};
            }
            return acc;
          },
          {} as Record<string, unknown>
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching operation info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/ocpp/operations/[operation]
 * Execute a specific OCPP operation (Admin Only)
 */
/**
 * Check if user has admin permissions for OCPP operations
 */
async function checkAdminPermissions(request: Request): Promise<boolean> {
  // In a real implementation, you would check the user's authentication token
  // and verify they have admin permissions. For now, we'll check for an admin header.
  const adminKey = request.headers.get('X-Admin-Key');
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  if (!expectedAdminKey) {
    // If no admin key is configured, allow all requests (development mode)
    return true;
  }

  return adminKey === expectedAdminKey;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> }
) {
  const { operation } = await params;

  try {
    // Check admin permissions for OCPP operations
    const hasAdminAccess = await checkAdminPermissions(request);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required for OCPP operations' },
        { status: 403 }
      );
    }
    const body = await request.json();

    // Validate operation exists
    if (!OPERATION_SCHEMAS[operation as keyof typeof OPERATION_SCHEMAS]) {
      return NextResponse.json({ error: 'Unknown OCPP operation' }, { status: 404 });
    }

    // Validate parameters
    const validationErrors = validateOperationParams(operation, body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Verify charger exists and get charge_box_id for SteVe
    const charger = await supabase.getChargerById(body.chargerId);
    if (!charger) {
      return NextResponse.json({ error: 'Charger not found' }, { status: 404 });
    }

    // Get the SteVe charge_box_id for the operation
    const chargeBoxId = charger.charge_box_id;

    // Additional validation for destructive operations
    const destructiveOps = ['Reset', 'ChangeConfiguration'];
    const connectorOps = ['RemoteStartTransaction', 'ReserveNow', 'UnlockConnector'];
    const tagOps = ['RemoteStartTransaction', 'ReserveNow'];

    if (destructiveOps.includes(operation)) {
      // Log destructive operations for audit trail
      console.warn(
        `Destructive OCPP operation ${operation} requested for charger ${body.chargerId}`,
        {
          operation,
          charger: charger.charge_box_id,
          timestamp: new Date().toISOString(),
          parameters: body,
        }
      );
    }

    // Validate connector exists for connector-specific operations
    if (connectorOps.includes(operation) && body.connectorId) {
      const { data: connector } = await supabase.client
        .from('connectors')
        .select('id, connector_idx')
        .eq('charger_id', charger.id)
        .eq('connector_idx', body.connectorId)
        .single();

      if (!connector) {
        return NextResponse.json(
          { error: `Connector ${body.connectorId} not found on charger ${charger.charge_box_id}` },
          { status: 404 }
        );
      }
    }

    // Validate tag exists for tag-specific operations
    if (tagOps.includes(operation) && body.idTag) {
      const { data: tag } = await supabase.client
        .from('ocpp_tags')
        .select('id_tag, tag_type, steve_tag_pk')
        .eq('id_tag', body.idTag)
        .single();

      if (!tag) {
        return NextResponse.json({ error: `OCPP tag ${body.idTag} not found` }, { status: 404 });
      }

      // For user tags, verify they're properly linked
      if (tag.tag_type === 'user') {
        const userTag = await supabase.getUserByNanoidTag(body.idTag);
        if (!userTag) {
          return NextResponse.json(
            { error: `User tag ${body.idTag} is not linked to any user` },
            { status: 403 }
          );
        }
      }
    }

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Execute the OCPP operation
    let result;
    try {
      switch (operation) {
        case 'RemoteStartTransaction':
          result = await steveService.remoteStartTransaction(
            chargeBoxId,
            body.connectorId,
            body.idTag
          );
          break;
        case 'RemoteStopTransaction':
          result = await steveService.remoteStopTransaction(chargeBoxId, body.transactionId);
          break;
        case 'ReserveNow':
          result = await steveService.reserveNow(
            chargeBoxId,
            body.connectorId,
            body.idTag,
            new Date(body.expiry)
          );
          break;
        case 'UnlockConnector':
          result = await steveService.unlockConnector(chargeBoxId, body.connectorId);
          break;
        case 'Reset':
          result = await steveService.resetChargePoint(chargeBoxId, body.resetType);
          break;
        default:
          // For other operations, use the generic executeOcppOperation method
          // Replace chargerId with chargeBoxId in the request body
          const steveRequest = { ...body, chargeBoxId };
          delete steveRequest.chargerId;
          result = await steveService.executeOcppOperation(operation, 'v1.6', steveRequest);
          break;
      }
    } catch (steveError) {
      await steveService.logout();
      throw steveError;
    }

    await steveService.logout();

    // Log successful operation for audit trail
    console.info(`OCPP operation ${operation} completed successfully`, {
      operation,
      charger: {
        id: charger.id,
        name: charger.name,
        charge_box_id: charger.charge_box_id,
      },
      parameters: body,
      result: result,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      operation: operation,
      charger: {
        id: charger.id,
        name: charger.name,
        charge_box_id: charger.charge_box_id,
        is_hidden: charger.is_hidden,
      },
      request: body,
      result: result,
      timestamp: new Date().toISOString(),
      audit: {
        logged: true,
        operation_type: destructiveOps.includes(operation) ? 'destructive' : 'safe',
      },
    });
  } catch (error) {
    console.error(`Error executing OCPP operation ${operation}:`, error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SteVeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
