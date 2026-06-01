import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  verify: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let sessionsService: SessionsService;
  let auditService: AuditService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockSession = {
    id: 'session-id-123',
    userId: 'user-id-123',
    refreshTokenHash: 'hashed-token',
    revoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0',
    lastActiveAt: new Date(),
    createdAt: new Date(),
  };

  const mockContext = {
    ipAddress: '127.0.0.1',
    deviceInfo: 'Mozilla/5.0',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createSession: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllUserSessions: jest.fn(),
            findSessionById: jest.fn(),
            findSessionByRefreshToken: jest.fn(),
            updateSessionActivity: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logSignup: jest.fn(),
            logLogin: jest.fn(),
            logLogout: jest.fn(),
            logRefresh: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'jwt.accessSecret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    sessionsService = module.get<SessionsService>(SessionsService);
    auditService = module.get<AuditService>(AuditService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('register', () => {
    it('should register a new user and issue tokens', async () => {
      jest.spyOn(usersService, 'createUser').mockResolvedValue(mockUser as any);
      jest.spyOn(sessionsService, 'createSession').mockResolvedValue(mockSession as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      jest.spyOn(usersService, 'updateLastLogin').mockResolvedValue(undefined);

      const result = await service.register(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        mockContext
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(usersService.createUser).toHaveBeenCalled();
      expect(sessionsService.createSession).toHaveBeenCalled();
      expect(auditService.logSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUser.id,
        })
      );
    });

    it('should not expose passwordHash in response', async () => {
      jest.spyOn(usersService, 'createUser').mockResolvedValue({
        ...mockUser,
        passwordHash: 'secret-hash',
      } as any);
      jest.spyOn(sessionsService, 'createSession').mockResolvedValue(mockSession as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      jest.spyOn(usersService, 'updateLastLogin').mockResolvedValue(undefined);

      const result = await service.register(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        mockContext
      );

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed-password',
      } as any);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should return null if password is invalid', async () => {
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed-password',
      } as any);

      const result = await service.validateUser('test@example.com', 'invalid-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should issue tokens on successful login', async () => {
      jest.spyOn(sessionsService, 'createSession').mockResolvedValue(mockSession as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      jest.spyOn(usersService, 'updateLastLogin').mockResolvedValue(undefined);

      const result = await service.login(mockUser as any, mockContext);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(auditService.logLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUser.id,
        })
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'USER',
      };

      jest.spyOn(sessionsService, 'findSessionByRefreshToken').mockResolvedValue(mockSession as any);
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('new-token');
      jest.spyOn(sessionsService, 'updateSessionActivity').mockResolvedValue(mockSession as any);

      const result = await service.refreshTokens(payload as any, 'refresh-token', mockContext);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(sessionsService.updateSessionActivity).toHaveBeenCalled();
      expect(auditService.logRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUser.id,
        })
      );
    });

    it('should reject if session not active', async () => {
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'USER',
      };

      jest
        .spyOn(sessionsService, 'findSessionByRefreshToken')
        .mockResolvedValue(null);

      await expect(
        service.refreshTokens(payload as any, 'refresh-token', mockContext)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session on logout', async () => {
      const payload = {
        sub: 'user-id-123',
        email: 'test@example.com',
        role: 'USER',
      };

      jest.spyOn(sessionsService, 'findSessionByRefreshToken').mockResolvedValue(mockSession as any);
      jest.spyOn(sessionsService, 'revokeSession').mockResolvedValue(mockSession as any);

      const result = await service.logout(payload as any, mockContext, 'refresh-token');

      expect(result.success).toBe(true);
      expect(sessionsService.revokeSession).toHaveBeenCalledWith(mockSession.id);
      expect(auditService.logLogout).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: payload.sub,
        })
      );
    });
  });
});
