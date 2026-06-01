# MTN MoMo API Research

## Overview

MTN Mobile Money (MoMo) is a mobile financial services platform operating across Africa. The API enables businesses to integrate payment collection, disbursement, and balance inquiry capabilities.

## API Structure

### Base URLs

- **Sandbox**: `https://sandbox.momodeveloper.mtn.com`
- **Production**: `https://api.mtn.com`

### Core APIs

1. **Collection API** — Receive money from customers
2. **Disbursement API** — Send money to customers
3. **Remittance API** — International money transfers
4. **Account Holder Query API** — Verify account details

## Authentication Model

MTN MoMo uses two-tier authentication:

1. **Primary Authentication** (Subscription Key)
   - API key for subscription tier identification
   - Rate limiting and usage tracking
   - Required in headers: `Ocp-Apim-Subscription-Key`

2. **Secondary Authentication** (OAuth 2.0)
   - Bearer token for individual requests
   - Token obtained via `/oauth/token` endpoint
   - 60-minute validity window

## Request/Response Format

### Standard Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
Ocp-Apim-Subscription-Key: <subscription_key>
X-Reference-Id: <idempotency_key>
```

### Status Codes

- `200` — Success
- `201` — Created (async operations)
- `400` — Bad Request (validation error)
- `401` — Unauthorized (auth failure)
- `409` — Conflict (duplicate transaction)
- `500` — Server Error

## Transaction Flow

### Collection (Request-to-Pay)

1. Initiate RtP request with amount, currency, party identifier
2. MTN sends USSD/SMS prompt to customer
3. Customer authorizes payment
4. Webhook notifies your system with result
5. Query transaction status for confirmation

### Disbursement

1. Submit disbursement request with amount and recipient
2. Asynchronous processing
3. Webhook callback with status
4. Query API for transaction details

## Rate Limiting

- **Sandbox**: 1000 requests per hour
- **Production**: Varies by subscription tier
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

### Common Error Codes

- `INSUFFICIENT_BALANCE` — Recipient account has insufficient funds
- `TRANSACTION_FAILED` — General transaction failure
- `NOT_ALLOWED` — Operation not permitted for account type
- `INVALID_CURRENCY` — Unsupported currency
- `ACCOUNT_HOLDER_LIMIT_REACHED` — Daily/monthly limit exceeded

## Key Considerations

### Idempotency

- All requests must include `X-Reference-Id` header
- Prevents duplicate charges on network retries
- MTN tracks 72 hours of request history

### Webhook Reliability

- Webhooks may arrive out of order
- Must handle duplicate notifications
- Implement notification reconciliation

### Latency

- Collection operations: 2-5 minute authorization window
- Disbursement operations: 5-30 minutes processing
- Status queries essential for accurate reconciliation

## Compliance & Limits

- **Daily Limits**: 50,000,000 currency units per account
- **Transaction Limits**: 1,000,000 currency units per transaction
- **Know Your Customer (KYC)**: Varies by market

## Testing Strategy

1. Use sandbox environment for development
2. Test with provided test credentials
3. Validate webhook signature verification
4. Simulate timeout and retry scenarios
5. Pre-production staging environment validation
