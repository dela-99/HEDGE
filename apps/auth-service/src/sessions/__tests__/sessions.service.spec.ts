import { SessionsService } from '../sessions.service';

describe('SessionsService', () => {
  const prisma = {
    session: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: SessionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionsService(prisma as never);
  });

  it('stores only a hashed refresh token', async () => {
    prisma.session.create.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'hashed-token',
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0',
      lastActiveAt: new Date('2026-01-01T00:00:00.000Z'),
      revoked: false,
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.createSession({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'hashed-token',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      ipAddress: '127.0.0.1',
      deviceInfo: 'Mozilla/5.0',
    });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed-token',
        expiresAt: new Date('2026-01-08T00:00:00.000Z'),
        ipAddress: '127.0.0.1',
        deviceInfo: 'Mozilla/5.0',
      },
    });
  });
});
