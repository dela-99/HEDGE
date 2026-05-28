import { Role } from '@prisma/client';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as never);
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'merchant@example.com',
      role: Role.merchant_owner,
      isVerified: true,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.findById('user-1')).resolves.toMatchObject({
      id: 'user-1',
      email: 'merchant@example.com',
    });
  });
});
