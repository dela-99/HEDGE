# MTN MoMo Webhook Specification

## Overview

Webhooks provide asynchronous notifications of transaction outcomes. Your system must implement a reliable webhook receiver to handle MTN MoMo event notifications.

## Webhook Registration

### Configuration

- **Endpoint URL**: Publicly accessible HTTPS endpoint (TLS 1.2+)
- **Subscription**: Register in MTN Developer Portal
- **Supported Events**:
  - `collection.payment.request.result` (Collection result)
  - `disbursement.transfer.result` (Disbursement result)

### Retry Policy

- Initial delivery attempt immediately
- Retry delays: 5 seconds, 30 seconds, 1 minute, 5 minutes, 15 minutes
- Maximum 5 attempts over ~30 minute window
- Exponential backoff with jitter

## Webhook Request Format

### HTTP Method

```
POST /webhooks/mtn-momo
```

### Headers

```
Content-Type: application/json
X-Callback-Hash: <HMAC-SHA256>
```

### Body Structure

#### Collection Payment Result

```json
{
  "notificationType": "payment",
  "transactionId": "txn_20240601_001234",
  "externalId": "your-reference-id-123",
  "status": "SUCCESSFUL",
  "amount": 10000,
  "currency": "XOF",
  "payer": {
    "partyIdType": "MSISDN",
    "partyId": "+221771234567"
  },
  "payee": {
    "partyIdType": "BUSINESS",
    "partyId": "business-id-001"
  },
  "reason": null,
  "timestamp": "2024-06-01T12:34:56Z",
  "requestTimestamp": "2024-06-01T12:30:00Z"
}
```

#### Disbursement Transfer Result

```json
{
  "notificationType": "transfer",
  "transactionId": "txn_20240601_005678",
  "externalId": "disbursement-ref-456",
  "status": "SUCCESSFUL",
  "amount": 5000,
  "currency": "XOF",
  "recipient": {
    "partyIdType": "MSISDN",
    "partyId": "+221779876543"
  },
  "sender": {
    "partyIdType": "BUSINESS",
    "partyId": "business-id-001"
  },
  "reason": null,
  "timestamp": "2024-06-01T12:45:30Z",
  "requestTimestamp": "2024-06-01T12:44:00Z"
}
```

## Status Values

### Transaction Status

- `SUCCESSFUL` — Transaction completed successfully
- `FAILED` — Transaction declined/failed
- `PENDING` — Transaction awaiting authorization
- `TIMEOUT` — Customer did not respond within timeout window
- `CANCELLED` — Transaction cancelled by customer or system

### Failure Reasons

- `INSUFFICIENT_BALANCE` — Low account balance
- `INVALID_ACCOUNT` — Account not found or inactive
- `LIMIT_EXCEEDED` — Transaction or daily limit exceeded
- `AUTHENTICATION_FAILED` — PIN/credential error
- `DUPLICATE_TRANSACTION` — Duplicate detected
- `UNKNOWN_ERROR` — Unspecified error

## Security

### Webhook Signature Verification

Every webhook includes `X-Callback-Hash` header for authentication.

**Verification Process:**

```
1. Extract X-Callback-Hash from headers
2. Retrieve webhook secret from environment
3. Compute HMAC-SHA256(request_body, secret)
4. Compare computed hash with X-Callback-Hash (constant-time comparison)
5. Reject if mismatch
```

**Implementation Example (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhook(body, receivedHash, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(receivedHash),
  );
}
```

## Implementation Requirements

### HTTP Response

- **Status Code**: Return `200` within 30 seconds
- **Body**: `{ "status": "success" }`
- Do NOT perform long operations in webhook handler

### Idempotency

- Process webhooks idempotently
- Use `transactionId` + `externalId` as deduplication key
- Store webhook receipt with hash to detect replays

### Error Handling

- Return `200` after successful processing (even if business logic fails)
- Log all webhook events with timestamp and full payload
- Implement dead-letter queue for failed processing
- Alert on missing webhooks (reconciliation)

### Database Transaction

```
1. Begin transaction
2. Check if transactionId+externalId already processed
3. Update transaction record with result
4. Mark as complete
5. Commit transaction
```

## Reconciliation Strategy

### Webhook Reliability Assumptions

- Some webhooks may fail to deliver
- Webhooks may arrive out of order
- Duplicate webhooks possible

### Reconciliation Process

- Query pending transactions daily (via Status API)
- Match against webhook records
- Reconcile discrepancies to single source of truth
- Alert on unexplained state mismatches

## Testing Webhooks

### Sandbox Testing

1. Initiate transaction with test credentials
2. Verify webhook arrives at configured endpoint
3. Test signature verification logic
4. Simulate retry by replaying webhook payload
5. Verify idempotency handling

### Monitoring

- Track webhook delivery success/failure rates
- Monitor webhook latency (timestamp vs arrival time)
- Alert on repeated verification failures
- Log all webhook payloads for audit trail
