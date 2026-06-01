import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../database/database.constants';
import Redis from 'ioredis';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: PrismaService;
  let redis: Redis;

  const mockSession = {
    id: 'session-id-123',
    userId: 'user-id-123',
    refreshTokenHash: 'hashed-token',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    deviceId: null,
    revokedAt: null,
    rotatedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastSeenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<Redis>(REDIS_CLIENT);
  });

  describe('createSession', () => {
    it('should create a new session and cache it in Redis', async () => {
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession as any);
      jest.spyOn(redis, 'set').mockResolvedValue('OK' as any);

      const result = await service.createSession({
        userId: 'user-id-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result).toEqual(mockSession);
      expect(prisma.session.create).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('storeRefreshToken', () => {
    it('should store hashed refresh token and update session', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      const result = await service.storeRefreshToken(
        'session-id-123',
        'refresh-token',
        new Date()
      );

      expect(result).toEqual(mockSession);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id-123' },
        })
      );
    });

    it('should never store raw refresh token', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      await service.storeRefreshToken('session-id-123', 'refresh-token', new Date());

      const updateCall = jest.spyOn(prisma.session, 'update').mock.calls[0];
      expect(updateCall[0].data).toHaveProperty('refreshTokenHash');
      expect(updateCall[0].data.refreshTokenHash).not.toBe('refresh-token');
    });
  });

  describe('assertActiveSession', () => {
    it('should return session if active', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);

      const result = await service.assertActiveSession('session-id-123', 'user-id-123');

      expect(result).toEqual(mockSession);
    });

    it('should reject if session not found', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(null);

      await expect(
        service.assertActiveSession('nonexistent-id', 'user-id-123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if userId does not match', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);

      await expect(
        service.assertActiveSession('session-id-123', 'different-user-id')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if session is revoked', async () => {
      const revokedSession = { ...mockSession, revokedAt: new Date() };
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(revokedSession as any);

      await expect(
        service.assertActiveSession('session-id-123', 'user-id-123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if session is expired', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(expiredSession as any);

      await expect(
        service.assertActiveSession('session-id-123', 'user-id-123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token and update session metadata', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      const result = await service.rotateRefreshToken(
        'session-id-123',
        'new-refresh-token',
        new Date()
      );

      expect(result).toEqual(mockSession);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rotatedAt: expect.any(Date),
            lastSeenAt: expect.any(Date),
          }),
        })
      );
    });

    it('should hash the new refresh token', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      await service.rotateRefreshToken('session-id-123', 'new-refresh-token', new Date());

      const updateCall = jest.spyOn(prisma.session, 'update').mock.calls[0];
      expect(updateCall[0].data.refreshTokenHash).not.toBe('new-refresh-token');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session and delete Redis cache', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);
      jest.spyOn(redis, 'del').mockResolvedValue(1);

      await service.revokeSession('session-id-123');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        })
      );
      expect(redis.del).toHaveBeenCalledWith('hedge:session:session-id-123');
    });
  });

  describe('Session Security Validation', () => {
    it('should track device info (ipAddress and userAgent)', async () => {
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession as any);

      await service.createSession({
        userId: 'user-id-123',
        expiresAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });

    it('should only accept active sessions', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);

      const result = await service.assertActiveSession('session-id-123', 'user-id-123');

      expect(result.revokedAt).toBeNull();
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
