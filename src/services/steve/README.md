# SteVe Service Client

A comprehensive TypeScript client for SteVe OCPP Server that combines REST API and web scraping capabilities to provide complete functionality.

## Features

- **Hybrid Architecture**: Combines official REST API with web scraping for complete coverage
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Authentication**: Automatic session management with CSRF protection
- **Error Handling**: Robust error handling with custom error types
- **Data Enrichment**: Automatically combines related data (e.g., charge points with connectors)
- **Modern Patterns**: Built with 2025 TypeScript best practices

## Quick Start

```typescript
import { createSteVeService } from './services/steve';

const steve = createSteVeService({
  serverUrl: 'https://your-steve-server.com',
  username: 'admin',
  password: 'your-password',
  authKey: 'optional-api-key', // For REST API if configured
});

// Authenticate
await steve.authenticate();

// Get all charge points with connectors
const chargePoints = await steve.getChargePoints();

// Get real-time connector status
const connectors = await steve.getConnectorStatus();

// Start a charging session
const result = await steve.remoteStartTransaction('CHARGER_001', 1, 'RFID_TAG_123');
```

## Core Concepts

### Charge Points

Manage charging stations with complete information including connectors, location, and configuration.

```typescript
// Get all charge points
const chargePoints = await steve.getChargePoints();

// Get specific charge point with connectors
const charger = await steve.getChargePoint('CHARGER_001');

// Create new charge point
const newCharger = await steve.createChargePoint({
  chargeBoxId: 'NEW_CHARGER',
  description: 'New Charging Station',
  registrationStatus: 'Accepted',
  insertConnectorStatusAfterTransactionMsg: true,
  address: {
    street: '123 Main St',
    city: 'Anytown',
    zipCode: '12345',
  },
});

// Batch create multiple charge points
const chargers = await steve.batchCreateChargePoints(['CHARGER_002', 'CHARGER_003', 'CHARGER_004']);
```

### OCPP Tags

Manage RFID tags with hierarchical relationships and transaction history.

```typescript
// Get all tags with hierarchy
const tags = await steve.getOcppTags();

// Get specific tag with children and transactions
const tag = await steve.getOcppTag(123);

// Create new tag
const newTag = await steve.createOcppTag({
  idTag: 'NEW_TAG_001',
  parentIdTag: 'PARENT_TAG', // Optional
  expiryDate: new Date('2025-12-31'),
  maxActiveTransactionCount: 1,
  note: 'Employee tag',
});

// Search tags
const foundTags = await steve.searchOcppTags('employee');
```

### Users

Manage users with their associated OCPP tags and personal information.

```typescript
// Get all users with OCPP tag information
const users = await steve.getUsers();

// Get specific user
const user = await steve.getUser(456);

// Create new user
const newUser = await steve.createUser({
  ocppIdTag: 'USER_TAG_001',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: {
    street: '456 Oak Ave',
    city: 'Somewhere',
    zipCode: '67890',
  },
});
```

### Transactions

Monitor and manage charging transactions with enriched data.

```typescript
// Get all transactions with charge point and user info
const transactions = await steve.getTransactions();

// Get active transactions
const activeTransactions = await steve.getActiveTransactions();

// Get transactions for specific charge point
const chargerTransactions = await steve.getTransactions({
  chargeBoxId: 'CHARGER_001',
  type: 'ALL',
  periodType: 'LAST_30',
});

// Get transaction statistics
const stats = await steve.getTransactionStats('CHARGER_001');
```

### OCPP Operations

Execute OCPP commands on charge points.

```typescript
// Reserve a connector
await steve.reserveNow(
  'CHARGER_001',
  1,
  'RFID_TAG_123',
  new Date(Date.now() + 3600000) // 1 hour from now
);

// Start charging remotely
await steve.remoteStartTransaction('CHARGER_001', 1, 'RFID_TAG_123');

// Stop charging
await steve.remoteStopTransaction('CHARGER_001', 12345);

// Unlock connector
await steve.unlockConnector('CHARGER_001', 1);

// Reset charge point
await steve.resetChargePoint('CHARGER_001', 'Soft');

// Execute custom OCPP operation
await steve.executeOcppOperation('DataTransfer', 'v1.6', {
  chargeBoxId: 'CHARGER_001',
  vendorId: 'CustomVendor',
  messageId: 'CustomMessage',
  data: JSON.stringify({ custom: 'data' }),
});
```

### System Monitoring

Get system status and health information.

```typescript
// Get system overview
const status = await steve.getSystemStatus();

// Get connector status summary
const connectorSummary = await steve.getConnectorStatusSummary();

// Health check
const health = await steve.healthCheck();
console.log('System healthy:', health.overall);
```

## Error Handling

The client provides comprehensive error handling with custom error types:

```typescript
import { SteVeError, SteVeAuthenticationError, SteVeValidationError } from './services/steve';

try {
  await steve.getChargePoints();
} catch (error) {
  if (error instanceof SteVeAuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Re-authenticate
    await steve.authenticate();
  } else if (error instanceof SteVeValidationError) {
    console.error('Validation error:', error.message, 'Field:', error.field);
  } else if (error instanceof SteVeError) {
    console.error('SteVe error:', error.message, 'Code:', error.code);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

```typescript
interface SteVeConfig {
  serverUrl: string; // SteVe server URL
  username: string; // Admin username
  password: string; // Admin password
  authKey?: string; // Optional REST API key
}
```

## Architecture

The client is built with a layered architecture:

1. **SteVeService**: High-level unified interface
2. **SteVeWebClient**: Web scraping for operations not in REST API
3. **SteVeRestClient**: Official REST API client
4. **SteVeBaseClient**: Base authentication and HTTP handling

## Data Enrichment

The service automatically enriches data by combining information from multiple sources:

- **Charge Points** include real-time connector status
- **OCPP Tags** include hierarchical relationships and transaction history
- **Users** include associated OCPP tag information
- **Transactions** include charge point, user, and connector details

## Best Practices

1. **Authentication**: Always authenticate before making requests
2. **Error Handling**: Use specific error types for better error handling
3. **Resource Cleanup**: Call `logout()` when done to clean up sessions
4. **Rate Limiting**: Be mindful of request frequency to avoid overwhelming the server
5. **Data Freshness**: Real-time data (like connector status) should be fetched frequently

## Advanced Usage

### Custom Clients

For advanced use cases, you can use individual clients directly:

```typescript
import { SteVeRestClient, SteVeWebClient } from './services/steve';

// Use only REST API
const restClient = new SteVeRestClient(config);
const tags = await restClient.getOcppTags();

// Use only web scraping
const webClient = new SteVeWebClient(config);
await webClient.authenticate();
const chargePoints = await webClient.getChargePoints();
```

### Session Management

```typescript
// Check authentication status
if (!steve.isAuthenticated()) {
  await steve.authenticate();
}

// Get session information
const session = steve.getSession();
console.log('Session expires:', session?.expiresAt);

// Manual logout
await steve.logout();
```

## Limitations

- **Update Operations**: Some update endpoints may require special permissions
- **Real-time Updates**: No WebSocket support; use polling for real-time data
- **Batch Operations**: Limited batch operation support in REST API
- **File Uploads**: Not supported in current version

## Contributing

When extending the client:

1. Add new types to `types.ts`
2. Implement in appropriate client (`rest-client.ts` or `web-client.ts`)
3. Expose through unified service in `steve-service.ts`
4. Update exports in `index.ts`
5. Add tests and documentation
