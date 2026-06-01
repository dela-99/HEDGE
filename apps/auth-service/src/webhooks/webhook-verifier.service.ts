import { Injectable, Logger, Inject, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { MtnWebhookDto } from '../mtn-momo/dto/mtn-webhook.dto';
import { REDIS_CLIENT } from '../database/database.constants';
import {
  VerifiedWebhookResult,
  WebhookVerificationError,
  WebhookVerificationErrorCode,
} from './interfaces/webhook-verifier.interfaces';

/**
 * Service for verifying MTN MoMo webhook authenticity and integrity.
 * Responsibilities:
 * - Verify webhook signature (HMAC-SHA256)
 * - Verify required headers
 * - Verify request structure
 * - Reject malformed payloads
 * - Reject replayed requests
 * - Generate verification audit log entries
 */
@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);
  private readonly webhookSecret: string;
  private readonly replayAttackTTL = 24 * 60 * 60; // 24 hours in seconds

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>('webhooks.secret');
  }

  /**
   * Verify webhook authenticity, headers, structure, and replay status.
   *
   * @param dto - The parsed webhook DTO
   * @param rawBody - The raw request body as string for signature verification
   * @param signature - The X-Callback-Hash header value
   * @param ipAddress - Optional IP address for audit logging
   * @returns VerifiedWebhookResult if verification succeeds
   * @throws UnauthorizedException if signature verification fails
   * @throws BadRequestException if structure or replay check fails
   */
  async verifyWebhook(
    dto: MtnWebhookDto,
    rawBody: string,
    signature: string | undefined,
    ipAddress?: string,
  ): Promise<VerifiedWebhookResult> {
    try {
      // Step 1: Verify required fields
      this.verifyRequiredFields(dto);

      // Step 2: Verify signature
      this.verifySignature(rawBody, signature);

      // Step 3: Check for replay attacks
      await this.checkReplayAttack(dto.transactionId, dto.externalId);

      // Step 4: Store webhook receipt to prevent replays
      await this.storeWebhookReceipt(dto.transactionId, dto.externalId, signature!);

      // Step 5: Log successful verification
      await this.logVerificationAudit(
        {
          transactionId: dto.transactionId,
          externalId: dto.externalId,
          notificationType: dto.notificationType,
          isValid: true,
        },
        ipAddress,
      );

      const verifiedResult: VerifiedWebhookResult = {
        isValid: true,
        transactionId: dto.transactionId,
        externalId: dto.externalId,
        notificationType: dto.notificationType,
        verifiedAt: new Date(),
      };

      this.logger.debug(
        `Webhook verification successful for transactionId: ${dto.transactionId}, externalId: ${dto.externalId}`,
      );

      return verifiedResult;
    } catch (error) {
      // Log failed verification
      await this.logVerificationAuditFailure(
        {
          transactionId: dto.transactionId,
          externalId: dto.externalId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress,
      );

      throw error;
    }
  }

  /**
   * Verify that all required fields are present in the webhook payload.
   */
  private verifyRequiredFields(dto: MtnWebhookDto): void {
    const requiredFields: Array<keyof MtnWebhookDto> = [
      'notificationType',
      'transactionId',
      'externalId',
      'status',
      'amount',
      'currency',
    ];

    for (const field of requiredFields) {
      if (!dto[field]) {
        const error: WebhookVerificationError = {
          code: WebhookVerificationErrorCode.MISSING_REQUIRED_FIELDS,
          message: `Missing required field: ${String(field)}`,
          details: { field },
        };
        this.logger.warn(`Webhook verification failed: ${error.message}`);
        throw new BadRequestException(error);
      }
    }
  }

  /**
   * Verify the HMAC-SHA256 signature matches the X-Callback-Hash header.
   * Uses constant-time comparison to prevent timing attacks.
   */
  private verifySignature(rawBody: string, signature: string | undefined): void {
    if (!signature) {
      const error: WebhookVerificationError = {
        code: WebhookVerificationErrorCode.MISSING_SIGNATURE,
        message: 'Missing X-Callback-Hash header',
      };
      this.logger.warn(`Webhook verification failed: ${error.message}`);
      throw new UnauthorizedException(error);
    }

    const computed = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isValid = false;
    try {
      isValid = timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      isValid = false;
    }

    if (!isValid) {
      const error: WebhookVerificationError = {
        code: WebhookVerificationErrorCode.INVALID_SIGNATURE,
        message: 'Webhook signature verification failed',
      };
      this.logger.warn(
        `Webhook verification failed: ${error.message} (computed: ${computed.substring(0, 8)}..., received: ${signature.substring(0, 8)}...)`,
      );
      throw new UnauthorizedException(error);
    }
  }

  /**
   * Check if this webhook has been received before (replay attack detection).
   * Uses transactionId + externalId as the deduplication key.
   */
  private async checkReplayAttack(transactionId: string, externalId: string): Promise<void> {
    const replayKey = this.getReplayKey(transactionId, externalId);
    const exists = await this.redis.exists(replayKey);

    if (exists) {
      const error: WebhookVerificationError = {
        code: WebhookVerificationErrorCode.REPLAY_ATTACK,
        message: 'Webhook appears to be a replay (duplicate transactionId and externalId)',
        details: { transactionId, externalId },
      };
      this.logger.warn(`Webhook verification failed: ${error.message}`);
      throw new BadRequestException(error);
    }
  }

  /**
   * Store webhook receipt in Redis to detect future replays.
   */
  private async storeWebhookReceipt(
    transactionId: string,
    externalId: string,
    signature: string,
  ): Promise<void> {
    const replayKey = this.getReplayKey(transactionId, externalId);
    const receiptData = JSON.stringify({
      transactionId,
      externalId,
      signature,
      receivedAt: new Date().toISOString(),
    });

    await this.redis.setex(replayKey, this.replayAttackTTL, receiptData);
  }

  /**
   * Log successful webhook verification to audit log.
   */
  private async logVerificationAudit(
    data: {
      transactionId: string;
      externalId: string;
      notificationType: string;
      isValid: boolean;
    },
    ipAddress?: string,
  ): Promise<void> {
    try {
      // Store in Redis for quick access and audit trail
      const auditKey = `webhook:verification:${data.transactionId}:${data.externalId}`;
      const auditData = JSON.stringify({
        ...data,
        verifiedAt: new Date().toISOString(),
        ipAddress,
      });

      await this.redis.setex(auditKey, this.replayAttackTTL, auditData);
    } catch (error) {
      this.logger.error(`Failed to log webhook verification audit: ${error}`);
      // Don't throw - audit logging should not block webhook processing
    }
  }

  /**
   * Log failed webhook verification to audit log.
   */
  private async logVerificationAuditFailure(
    data: {
      transactionId: string;
      externalId: string;
      error: string;
    },
    ipAddress?: string,
  ): Promise<void> {
    try {
      const auditKey = `webhook:verification:failed:${data.transactionId}:${data.externalId}`;
      const auditData = JSON.stringify({
        ...data,
        verifiedAt: new Date().toISOString(),
        ipAddress,
      });

      await this.redis.setex(auditKey, this.replayAttackTTL, auditData);
    } catch (error) {
      this.logger.error(`Failed to log webhook verification failure audit: ${error}`);
      // Don't throw - audit logging should not block webhook processing
    }
  }

  /**
   * Generate Redis key for replay attack detection.
   */
  private getReplayKey(transactionId: string, externalId: string): string {
    return `webhook:replay:${transactionId}:${externalId}`;
  }
}
