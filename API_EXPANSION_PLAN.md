# API Expansion Plan: OCPP Tags & Transactions

## Overview
Now that SteVe REST API authentication is working with `X-API-KEY`, we need to create comprehensive API endpoints for OCPP tags and transactions management.

## Phase 1: OCPP Tags API Endpoints

### 1.1 `/api/tags` - List All Tags
- **Method**: GET
- **Query Parameters**: 
  - `page`, `limit` (pagination)
  - `q` (search by idTag or note)
  - `parent_only` (show only parent tags)
  - `in_transaction` (filter by transaction status)
- **Response**: Hierarchical tag structure with children
- **Features**: Search, pagination, filtering

### 1.2 `/api/tags/[id]` - Individual Tag Details
- **Method**: GET
- **Parameters**: `id` (ocppTagPk)
- **Response**: Tag details with children and recent transactions
- **Features**: Enhanced with transaction history

### 1.3 `/api/tags/[id]/transactions` - Tag Transaction History
- **Method**: GET
- **Parameters**: `id` (ocppTagPk)
- **Query Parameters**: `page`, `limit`, `period` (last_30, last_7, all)
- **Response**: Paginated transaction history for specific tag

## Phase 2: Transactions API Endpoints

### 2.1 `/api/transactions` - List All Transactions
- **Method**: GET
- **Query Parameters**:
  - `page`, `limit` (pagination)
  - `charger_id` (filter by charger)
  - `tag_id` (filter by OCPP tag)
  - `status` (active, completed, all)
  - `period` (last_30, last_7, custom)
  - `start_date`, `end_date` (custom date range)
- **Response**: Enhanced transactions with charger and tag details

### 2.2 `/api/transactions/[id]` - Individual Transaction Details
- **Method**: GET
- **Parameters**: `id` (transaction ID)
- **Response**: Complete transaction details with charger, connector, and tag info

### 2.3 `/api/transactions/active` - Active Transactions
- **Method**: GET
- **Response**: All currently active transactions across all chargers

## Phase 3: Enhanced Charger Endpoints

### 3.1 Update `/api/charger/[id]` - Add Transaction Data
- **Enhancement**: Include active transactions in charger response
- **New Fields**: 
  - `active_transactions[]`
  - `current_user` (if transaction active)
  - `session_start_time`

### 3.2 `/api/charger/[id]/transactions` - Charger Transaction History
- **Method**: GET
- **Parameters**: `id` (charger ID)
- **Query Parameters**: `page`, `limit`, `period`
- **Response**: All transactions for specific charger

## Phase 4: System Overview Endpoints

### 4.1 `/api/system/status` - System Status
- **Method**: GET
- **Response**: System-wide statistics from SteVe
- **Data**: Charger counts, tag counts, active transactions, connector status

### 4.2 `/api/system/stats` - Usage Statistics
- **Method**: GET
- **Query Parameters**: `period` (today, week, month)
- **Response**: Usage statistics, energy consumption, popular tags

## Implementation Order

1. **Tags API** (`/api/tags`, `/api/tags/[id]`)
2. **Transactions API** (`/api/transactions`, `/api/transactions/[id]`)
3. **Enhanced Charger endpoints**
4. **System status endpoints**
5. **Comprehensive testing**

## Technical Requirements

### Validation Schemas
- Tag ID validation (ocppTagPk)
- Transaction ID validation
- Date range validation
- Pagination validation

### Error Handling
- Consistent error responses
- SteVe API error mapping
- Validation error handling

### Performance Considerations
- Caching for frequently accessed data
- Pagination for large datasets
- Efficient SteVe API usage

### Security
- Same authentication patterns as existing endpoints
- Input validation and sanitization
- Rate limiting considerations

## Success Criteria

1. ✅ All endpoints return consistent, well-structured data
2. ✅ Proper error handling and validation
3. ✅ Comprehensive testing against SteVe data
4. ✅ Performance optimization
5. ✅ Documentation and examples
