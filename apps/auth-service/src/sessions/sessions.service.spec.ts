import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  verify: jest.fn().mockResolvedValue(true),
}));

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: PrismaService;

  const mockSession = {
    id: 'session-id-123',
    userId: 'user-id-123',
    refreshTokenHash: 'hashed-token',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0',
    revoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(),
    createdAt: new Date(),
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
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createSession', () => {
    it('should create a new session with hashed refresh token', async () => {
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession as any);

      const result = await service.createSession({
        id: 'session-id-123',
        userId: 'user-id-123',
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Mozilla/5.0',
      });

      expect(result).toEqual(mockSession);
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshTokenHash: 'hashed-token',
            ipAddress: '127.0.0.1',
            deviceInfo: 'Mozilla/5.0',
          }),
        })
      );
    });

    it('should track device information (ipAddress and deviceInfo)', async () => {
      jest.spyOn(prisma.session, 'create').mockResolvedValue(mockSession as any);

      await service.createSession({
        id: 'session-id-123',
        userId: 'user-id-123',
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date(),
        ipAddress: '192.168.1.1',
        deviceInfo: 'Chrome/120',
      });

      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.1',
            deviceInfo: 'Chrome/120',
          }),
        })
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke a single session', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      const result = await service.revokeSession('session-id-123');

      expect(result).toEqual(mockSession);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id-123' },
          data: { revoked: true },
        })
      );
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active user sessions', async () => {
      jest.spyOn(prisma.session, 'updateMany').mockResolvedValue({ count: 3 });

      const result = await service.revokeAllUserSessions('user-id-123');

      expect(result).toBe(3);
      expect(prisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-id-123', revoked: false },
          data: { revoked: true },
        })
      );
    });
  });

  describe('findSessionById', () => {
    it('should find session by id', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any);

      const result = await service.findSessionById('session-id-123');

      expect(result).toEqual(mockSession);
      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id-123' },
        })
      );
    });

    it('should return null if session not found', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(null);

      const result = await service.findSessionById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findSessionByRefreshToken', () => {
    it('should find active session by refresh token', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([mockSession] as any);

      const result = await service.findSessionByRefreshToken('user-id-123', 'refresh-token');

      expect(result).toEqual(mockSession);
      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-id-123',
            revoked: false,
            expiresAt: { gt: expect.any(Date) },
          },
        })
      );
    });

    it('should return null if no sessions found', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([]);

      const result = await service.findSessionByRefreshToken('user-id-123', 'invalid-token');

      expect(result).toBeNull();
    });

    it('should verify refresh token matches session hash', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([mockSession] as any);
      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.findSessionByRefreshToken('user-id-123', 'valid-token');

      expect(result).toEqual(mockSession);
      expect(argon2.verify).toHaveBeenCalledWith(mockSession.refreshTokenHash, 'valid-token');
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session with new refresh token hash and activity', async () => {
      const updatedSession = {
        ...mockSession,
        refreshTokenHash: 'new-hashed-token',
        lastActiveAt: new Date(),
      };
      jest.spyOn(prisma.session, 'update').mockResolvedValue(updatedSession as any);

      const result = await service.updateSessionActivity('session-id-123', {
        refreshTokenHash: 'new-hashed-token',
        lastActiveAt: new Date(),
      });

      expect(result).toEqual(updatedSession);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id-123' },
          data: expect.objectContaining({
            refreshTokenHash: 'new-hashed-token',
          }),
        })
      );
    });

    it('should update device info and IP address on refresh', async () => {
      jest.spyOn(prisma.session, 'update').mockResolvedValue(mockSession as any);

      await service.updateSessionActivity('session-id-123', {
        ipAddress: '192.168.2.2',
        deviceInfo: 'Firefox/121',
        lastActiveAt: new Date(),
      });

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.2.2',
            deviceInfo: 'Firefox/121',
          }),
        })
      );
    });
  });

  describe('Session Security', () => {
    it('should only query for non-revoked, non-expired sessions', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([]);

      const result = await service.findSessionByRefreshToken('user-id-123', 'refresh-token');

      expect(result).toBeNull();
      // Verify the query correctly filters for active sessions
      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-id-123',
            revoked: false,
            expiresAt: { gt: expect.any(Date) },
          },
        })
      );
    });
  });
});
