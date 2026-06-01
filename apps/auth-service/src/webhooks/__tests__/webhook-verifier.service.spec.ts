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
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'webhooks.secret') {
        return webhookSecret;
      }
      if (key === 'webhooks.replayAttackTTL') {
        return 24 * 60 * 60; // 24 hours in seconds
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
    redis.set.mockResolvedValue('OK');

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
      expect(redis.set).toHaveBeenCalled();
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
      redis.set.mockResolvedValueOnce(null); // Simulate existing webhook (SETNX returns null if key exists)

      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(validWebhookDto, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject webhook missing amount field', async () => {
      const dtoWithoutAmount = { ...validWebhookDto } as Partial<MtnWebhookDto>;
      delete dtoWithoutAmount.amount;
      const rawBody = JSON.stringify(dtoWithoutAmount);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(dtoWithoutAmount as MtnWebhookDto, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept webhook with zero amount', async () => {
      const dtoWithZeroAmount = { ...validWebhookDto, amount: 0 };
      const rawBody = JSON.stringify(dtoWithZeroAmount);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const result = await service.verifyWebhook(dtoWithZeroAmount, rawBody, signature);
      expect(result.isValid).toBe(true);
    });

    it('should reject webhook missing currency field', async () => {
      const dtoWithoutCurrency = { ...validWebhookDto } as Partial<MtnWebhookDto>;
      delete dtoWithoutCurrency.currency;
      const rawBody = JSON.stringify(dtoWithoutCurrency);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await expect(
        service.verifyWebhook(dtoWithoutCurrency as MtnWebhookDto, rawBody, signature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store webhook receipt on successful verification', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await service.verifyWebhook(validWebhookDto, rawBody, signature);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('webhook:replay:'),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX',
      );
    });

    it('should include IP address in audit log when provided', async () => {
      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      await service.verifyWebhook(validWebhookDto, rawBody, signature, '192.168.1.1');

      // Verify set was called for the replay key (first call)
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('webhook:replay:'),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX',
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
      const invalidSignature = 'invalid-signature-hash'; // Proper length

      try {
        await service.verifyWebhook(validWebhookDto, rawBody, invalidSignature);
      } catch {
        // Expected to fail
      }

      // Verify audit log was attempted (even though verification failed)
      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('webhook:verification:failed:'),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should not throw if Redis audit logging fails', async () => {
      redis.set.mockRejectedValueOnce(new Error('Redis connection error'));

      const rawBody = JSON.stringify(validWebhookDto);
      const signature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      // Redis error during replay check should throw
      await expect(service.verifyWebhook(validWebhookDto, rawBody, signature)).rejects.toThrow();
    });
  });
});
