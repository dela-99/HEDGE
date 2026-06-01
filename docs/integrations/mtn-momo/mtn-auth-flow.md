# MTN MoMo Authentication Flow

## Overview

MTN MoMo authentication uses a two-layer model:

1. **Subscription Layer** — API key-based rate limiting and service identification
2. **Request Layer** — OAuth 2.0 bearer tokens for individual operations

## OAuth 2.0 Token Acquisition

### Endpoint

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
```

### Request Parameters

```
grant_type=client_credentials
client_id=<your-api-key>
client_secret=<your-api-secret>
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "default"
}
```

## Token Lifecycle

### Validity

- **Duration**: 60 minutes (3600 seconds)
- **Refresh**: Request new token before expiration
- **Reuse**: Single token valid for multiple requests

### Token Caching Strategy

```
1. Request token and store with expiration time
2. Add 30-second buffer (refresh at 55 minutes)
3. On expiration, request new token
4. Cache all tokens in-memory or distributed cache
5. Invalidate on 401 response (token revoked)
```

## Request Authentication

### Standard Headers for All Requests

```
Authorization: Bearer <access_token>
Ocp-Apim-Subscription-Key: <subscription-key>
Content-Type: application/json
X-Reference-Id: <idempotency-uuid>
```

### Header Details

**Authorization**

- Format: `Bearer <JWT_TOKEN>`
- Obtained from OAuth token endpoint
- Required for all API operations

**Ocp-Apim-Subscription-Key**

- Subscription tier identifier
- Enables rate limiting and usage tracking
- Provided during API subscription setup

**X-Reference-Id**

- Unique idempotency key (UUID v4 recommended)
- Prevents duplicate transaction processing
- Required for financial operations

## Implementation Patterns

### Node.js/Express Example

```javascript
const axios = require('axios');
const crypto = require('crypto');

class MTNMoMoAuth {
  constructor(apiKey, apiSecret, subscriptionKey) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.subscriptionKey = subscriptionKey;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseURL = 'https://sandbox.momodeveloper.mtn.com';
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry - 30000) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/oauth/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      throw new Error(`Token acquisition failed: ${error.message}`);
    }
  }

  buildAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      'X-Reference-Id': crypto.randomUUID(),
      'Content-Type': 'application/json',
    };
  }
}
```

### Python Example

```python
import requests
import uuid
from datetime import datetime, timedelta

class MTNMoMoAuth:
    def __init__(self, api_key, api_secret, subscription_key):
        self.api_key = api_key
        self.api_secret = api_secret
        self.subscription_key = subscription_key
        self.access_token = None
        self.token_expiry = None
        self.base_url = 'https://sandbox.momodeveloper.mtn.com'

    def get_access_token(self):
        if self.access_token and datetime.now() < (self.token_expiry - timedelta(seconds=30)):
            return self.access_token

        response = requests.post(
            f'{self.base_url}/oauth/token',
            data={
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.api_secret
            },
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Ocp-Apim-Subscription-Key': self.subscription_key
            }
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data['access_token']
        self.token_expiry = datetime.now() + timedelta(seconds=data['expires_in'])
        return self.access_token

    def build_auth_headers(self):
        return {
            'Authorization': f'Bearer {self.get_access_token()}',
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'X-Reference-Id': str(uuid.uuid4()),
            'Content-Type': 'application/json'
        }
```

## Error Handling

### Authentication Failures

**401 Unauthorized**

- Invalid or expired token
- Invalid subscription key
- Action: Request new token and retry

**403 Forbidden**

- Insufficient permissions for operation
- Account tier restriction
- Action: Verify subscription level

**429 Too Many Requests**

- Rate limit exceeded
- Action: Implement exponential backoff

### Retry Strategy

```
1. On 401: Invalidate token, request new token, retry
2. On 429: Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s)
3. On 5xx: Exponential backoff with circuit breaker
4. Maximum retries: 3 attempts
```

## Security Best Practices

### Credential Management

- Store credentials in environment variables (never hardcode)
- Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials periodically
- Never log credentials or access tokens

### Token Security

- Cache tokens in-memory only (never persist to disk)
- Implement token rotation policy
- Invalidate tokens on suspicious activity
- Use short-lived tokens (< 1 hour)

### HTTPS/TLS

- Enforce TLS 1.2+
- Verify certificate chains
- Use certificate pinning in production if available

### Request Validation

- Validate all webhook signatures
- Use constant-time comparison for sensitive data
- Implement request signing for sensitive operations
- Rate-limit retry attempts

## Testing Authentication

### Sandbox Testing Credentials

```
API Key: <provided-in-sandbox>
API Secret: <provided-in-sandbox>
Subscription Key: <provided-in-sandbox>
Base URL: https://sandbox.momodeveloper.mtn.com
```

### Test Scenarios

1. Successfully acquire token
2. Reuse token for multiple requests
3. Handle token expiration and refresh
4. Verify invalid credentials rejected
5. Test rate limiting behavior
6. Validate error responses

### Monitoring

- Track token acquisition failures
- Monitor auth error rates (4xx responses)
- Alert on repeated authentication failures
- Log all auth-related events for audit
