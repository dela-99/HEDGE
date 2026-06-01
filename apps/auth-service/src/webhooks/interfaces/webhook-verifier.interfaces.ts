/**
 * Webhook verification result indicating successful verification
 */
export interface VerifiedWebhookResult {
  isValid: boolean;
  transactionId: string;
  externalId: string;
  notificationType: string;
  verifiedAt: Date;
}

/**
 * Webhook verification error with specific reason
 */
export interface WebhookVerificationError {
  code: WebhookVerificationErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Error codes for webhook verification failures
 */
export enum WebhookVerificationErrorCode {
  MISSING_SIGNATURE = 'MISSING_SIGNATURE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  REPLAY_ATTACK = 'REPLAY_ATTACK',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
}

/**
 * Webhook verification audit log entry
 */
export interface WebhookVerificationAudit {
  id: string;
  transactionId: string;
  externalId: string;
  isValid: boolean;
  errorCode?: WebhookVerificationErrorCode;
  errorMessage?: string;
  ipAddress?: string;
  verifiedAt: Date;
}
