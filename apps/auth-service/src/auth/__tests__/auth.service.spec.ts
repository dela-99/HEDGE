import { Role } from '@prisma/client';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const usersService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const sessionsService = {
    createSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    findSessionById: jest.fn(),
    findSessionByRefreshToken: jest.fn(),
    updateSessionActivity: jest.fn(),
  };

  const auditService = {
    logSignup: jest.fn(),
    logLogin: jest.fn(),
    logLogout: jest.fn(),
    logFailedLogin: jest.fn(),
    logRefresh: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as never,
      sessionsService as never,
      auditService as never,
      jwtService as never,
      configService as never,
    );
  });

  it('returns the current user profile', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-1',
      email: 'merchant@example.com',
      role: Role.merchant_owner,
      isVerified: true,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.currentUser('user-1')).resolves.toMatchObject({
      id: 'user-1',
      email: 'merchant@example.com',
      role: Role.merchant_owner,
    });
  });
});
