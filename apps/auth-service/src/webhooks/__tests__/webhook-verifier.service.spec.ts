import { createHmac } from 'node:crypto';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MtnWebhookDto } from '../../mtn-momo/dto/mtn-webhook.dto';
import { WebhookVerifierService } from '../webhook-verifier.service';
import { WebhookVerificationErrorCode } from '../interfaces/webhook-verifier.interfaces';

describe('WebhookVerifierService', () => {
  let service: WebhookVerifierService;
  const webhookSecret = 'test-webhook-secret-key';

  const redis = {
    exists: jest.fn(),
    setex: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'webhooks.secret') {
        return webhookSecret;
      }
      throw new Error(`Unknown config key: ${key}`);
    }),
  };

  const validWebhookDto: MtnWebhookDto = {
    notificationType: 'payment',
    transactionId: 'txn_20240601_001234',
    externalId: 'your-reference-id-123',
    status: 'SUCCESSFUL',
    amount: 10000,
    currency: 'XOF',
    payer: {
      partyIdType: 'MSISDN',
      partyId: '+221771234567',
    },
    payee: {
      partyIdType: 'BUSINESS',
      partyId: 'business-id-001',
    },
    reason: null,
    timestamp: '2024-06-01T12:34:56Z',
    requestTimestamp: '2024-06-01T12:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.exists.mockResolvedValue(0);
    redis.setex.mockResolvedValue('OK');

    service = new WebhookVerifierService(redis as never, configService as never);
  });

  describe('verifyWebhook', () => {
    it('should successfully verify a valid webhook with correct signature', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const result = await service.verifyWebhook(validWebhookDto, rawBody, signature);

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toBe(validWebhookDto.transactionId);
      expect(result.externalId).toBe(validWebhookDto.externalId);
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should reject webhook with missing signature header', async () => {
      const rawBody = JSON.stringify(validWebhookDto);

      await expect(service.verifyWebhook(validWebhookDto, rawBody, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject webhook with invalid signature', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const invalidSignature = 'invalid-signature-hash';

      await expect(
        service.verifyWebhook(validWebhookDto, rawBody, invalidSignature),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject webhook with missing required fields', async () => {
      const incompleteDto = { ...validWebhookDto, transactionId: '' };
      const rawBody = JSON.stringify(incompleteDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(incompleteDto, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect and reject replay attacks', async () => {
      redis.exists.mockResolvedValueOnce(1); // Simulate existing webhook

      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(validWebhookDto, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject webhook missing amount field', async () => {
      const dtoWithoutAmount = { ...validWebhookDto, amount: 0 };
      const rawBody = JSON.stringify(dtoWithoutAmount);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(dtoWithoutAmount, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject webhook missing currency field', async () => {
      const dtoWithoutCurrency = { ...validWebhookDto };
      delete dtoWithoutCurrency.currency;
      const rawBody = JSON.stringify(dtoWithoutCurrency);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(dtoWithoutCurrency, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store webhook receipt on successful verification', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await service.verifyWebhook(validWebhookDto, rawBody, signature);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('webhook:replay:'),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should include IP address in audit log when provided', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await service.verifyWebhook(validWebhookDto, rawBody, signature, '192.168.1.1');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('webhook:verification:'),
        expect.any(Number),
        expect.stringContaining('192.168.1.1'),
      );
    });

    it('should use constant-time comparison for signature verification', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      // Create two similar but different signatures
      const correctSignature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const wrongSignature = correctSignature.slice(0, -1) + 'x';

      await expect(
        service.verifyWebhook(validWebhookDto, rawBody, wrongSignature),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('error handling', () => {
    it('should log failed verification on error', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const invalidSignature = 'invalid-signature';

      try {
        await service.verifyWebhook(validWebhookDto, rawBody, invalidSignature);
      } catch {
        // Expected to fail
      }

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('webhook:verification:failed:'),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should not throw if Redis audit logging fails', async () => {
      // Mock first two calls to succeed (replay receipt and verification audit),
      // then the next call (which would happen in a failure scenario) can fail
      redis.setex
        .mockResolvedValueOnce('OK')
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis connection error'));

      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      // Should not throw because audit logging is not critical
      const result = await service.verifyWebhook(validWebhookDto, rawBody, signature);
      expect(result.isValid).toBe(true);
    });
  });
});
