import { NextResponse } from 'next/server';

/**
 * OCPP 1.6 Operations Registry
 * Defines all supported OCPP operations with their metadata
 */
const OCPP_OPERATIONS = {
  // Remote Control Operations
  RemoteStartTransaction: {
    name: 'RemoteStartTransaction',
    description: 'Start a charging transaction remotely',
    version: 'v1.6',
    category: 'Remote Control',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      connectorId: { type: 'number', required: true, description: 'Connector number (1-based)' },
      idTag: { type: 'string', required: true, description: 'OCPP tag identifier' },
      chargingProfile: {
        type: 'object',
        required: false,
        description: 'Optional charging profile',
      },
    },
    example: {
      chargerId: 'ABC12345',
      connectorId: 1,
      idTag: 'OCPP-USER',
    },
  },
  RemoteStopTransaction: {
    name: 'RemoteStopTransaction',
    description: 'Stop a charging transaction remotely',
    version: 'v1.6',
    category: 'Remote Control',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      transactionId: { type: 'number', required: true, description: 'Transaction ID to stop' },
    },
    example: {
      chargerId: 'ABC12345',
      transactionId: 12345,
    },
  },

  // Reservation Operations
  ReserveNow: {
    name: 'ReserveNow',
    description: 'Reserve a connector for a specific user',
    version: 'v1.6',
    category: 'Reservation',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      connectorId: { type: 'number', required: true, description: 'Connector number (1-based)' },
      idTag: { type: 'string', required: true, description: 'OCPP tag identifier' },
      expiry: { type: 'string', required: true, description: 'Reservation expiry (ISO 8601)' },
      reservationId: { type: 'number', required: false, description: 'Optional reservation ID' },
    },
    example: {
      chargerId: 'ABC12345',
      connectorId: 1,
      idTag: 'OCPP-USER',
      expiry: '2025-06-28T15:00:00Z',
    },
  },
  CancelReservation: {
    name: 'CancelReservation',
    description: 'Cancel an existing reservation',
    version: 'v1.6',
    category: 'Reservation',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      reservationId: { type: 'number', required: true, description: 'Reservation ID to cancel' },
    },
    example: {
      chargerId: 'ABC12345',
      reservationId: 123,
    },
  },

  // Maintenance Operations
  UnlockConnector: {
    name: 'UnlockConnector',
    description: 'Unlock a connector',
    version: 'v1.6',
    category: 'Maintenance',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      connectorId: { type: 'number', required: true, description: 'Connector number (1-based)' },
    },
    example: {
      chargerId: 'ABC12345',
      connectorId: 1,
    },
  },
  Reset: {
    name: 'Reset',
    description: 'Reset a charge point',
    version: 'v1.6',
    category: 'Maintenance',
    destructive: true,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      resetType: { type: 'string', required: true, description: 'Reset type: Hard or Soft' },
    },
    example: {
      chargerId: 'ABC12345',
      resetType: 'Soft',
    },
  },

  // Configuration Operations
  ChangeConfiguration: {
    name: 'ChangeConfiguration',
    description: 'Change a configuration parameter',
    version: 'v1.6',
    category: 'Configuration',
    destructive: true,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      key: { type: 'string', required: true, description: 'Configuration key' },
      value: { type: 'string', required: true, description: 'Configuration value' },
    },
    example: {
      chargerId: 'ABC12345',
      key: 'HeartbeatInterval',
      value: '300',
    },
  },
  GetConfiguration: {
    name: 'GetConfiguration',
    description: 'Get configuration parameters',
    version: 'v1.6',
    category: 'Configuration',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      key: { type: 'array', required: false, description: 'Optional list of keys to retrieve' },
    },
    example: {
      chargerId: 'ABC12345',
      key: ['HeartbeatInterval', 'MeterValueSampleInterval'],
    },
  },

  // Data Operations
  DataTransfer: {
    name: 'DataTransfer',
    description: 'Send custom data to charge point',
    version: 'v1.6',
    category: 'Data',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      vendorId: { type: 'string', required: true, description: 'Vendor identifier' },
      messageId: { type: 'string', required: false, description: 'Optional message identifier' },
      data: { type: 'string', required: false, description: 'Optional data payload' },
    },
    example: {
      chargerId: 'ABC12345',
      vendorId: 'CustomVendor',
      messageId: 'CustomMessage',
      data: '{"custom": "data"}',
    },
  },

  // Cache Operations
  ClearCache: {
    name: 'ClearCache',
    description: 'Clear the authorization cache',
    version: 'v1.6',
    category: 'Cache',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
    },
    example: {
      chargerId: 'ABC12345',
    },
  },

  // Firmware Operations
  UpdateFirmware: {
    name: 'UpdateFirmware',
    description: 'Update charge point firmware',
    version: 'v1.6',
    category: 'Firmware',
    destructive: true,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      location: { type: 'string', required: true, description: 'Firmware download URL' },
      retrieveDate: {
        type: 'string',
        required: true,
        description: 'When to retrieve firmware (ISO 8601)',
      },
      retries: { type: 'number', required: false, description: 'Number of retries' },
      retryInterval: { type: 'number', required: false, description: 'Retry interval in seconds' },
    },
    example: {
      chargerId: 'ABC12345',
      location: 'https://example.com/firmware.bin',
      retrieveDate: '2025-06-30T15:00:00Z',
      retries: 3,
      retryInterval: 300,
    },
  },

  // Local List Operations
  SendLocalList: {
    name: 'SendLocalList',
    description: 'Send local authorization list to charge point',
    version: 'v1.6',
    category: 'LocalList',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      listVersion: { type: 'number', required: true, description: 'Version number of the list' },
      updateType: {
        type: 'string',
        required: true,
        description: 'Update type: Full or Differential',
      },
      localAuthorizationList: {
        type: 'array',
        required: false,
        description: 'List of authorization data',
      },
    },
    example: {
      chargerId: 'ABC12345',
      listVersion: 1,
      updateType: 'Full',
      localAuthorizationList: [],
    },
  },
  GetLocalListVersion: {
    name: 'GetLocalListVersion',
    description: 'Get version of local authorization list',
    version: 'v1.6',
    category: 'LocalList',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
    },
    example: {
      chargerId: 'ABC12345',
    },
  },

  // Trigger Operations
  TriggerMessage: {
    name: 'TriggerMessage',
    description: 'Trigger a message from charge point',
    version: 'v1.6',
    category: 'Trigger',
    destructive: false,
    requires_auth: true,
    parameters: {
      chargerId: { type: 'string', required: true, description: 'Charger nanoid identifier' },
      requestedMessage: { type: 'string', required: true, description: 'Message to trigger' },
      connectorId: { type: 'number', required: false, description: 'Connector ID (if applicable)' },
    },
    example: {
      chargerId: 'ABC12345',
      requestedMessage: 'Heartbeat',
      connectorId: 1,
    },
  },
};

/**
 * GET /api/admin/ocpp/operations
 * List all available OCPP operations with their metadata (Admin Only)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const destructive = url.searchParams.get('destructive');

    let operations = Object.values(OCPP_OPERATIONS);

    // Filter by category if specified
    if (category) {
      operations = operations.filter((op) => op.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by destructive flag if specified
    if (destructive !== null) {
      const isDestructive = destructive === 'true';
      operations = operations.filter((op) => op.destructive === isDestructive);
    }

    // Group operations by category
    const operationsByCategory = operations.reduce(
      (acc, op) => {
        if (!acc[op.category]) {
          acc[op.category] = [];
        }
        acc[op.category].push(op);
        return acc;
      },
      {} as Record<string, typeof operations>
    );

    return NextResponse.json({
      operations: {
        total: operations.length,
        by_category: Object.keys(operationsByCategory).reduce(
          (acc, cat) => {
            acc[cat] = operationsByCategory[cat].length;
            return acc;
          },
          {} as Record<string, number>
        ),
        data: operations,
        grouped: operationsByCategory,
      },
      categories: Object.keys(operationsByCategory),
      filters: {
        category: category || null,
        destructive: destructive || null,
      },
      // Legacy format for backward compatibility
      ocpp_operations: operations,
    });
  } catch (error) {
    console.error('Error fetching OCPP operations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
