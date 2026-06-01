import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: Role.merchant_owner,
    isVerified: false,
    mfaEnabled: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(userWithoutPassword as any);

      const result = await service.createUser({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });

      expect(result).toEqual(userWithoutPassword);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should normalize email before storing', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(userWithoutPassword as any);

      await service.createUser({
        email: 'Test@Example.com',
        passwordHash: 'hashed-password',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(
        service.createUser({
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should set role to merchant_owner by default', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(userWithoutPassword as any);

      await service.createUser({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: Role.merchant_owner,
          }),
        })
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user with passwordHash', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(result?.passwordHash).toBeDefined();
    });

    it('should normalize email before searching', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await service.findByEmail('Test@Example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should return null if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user without passwordHash', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithoutPassword as any);

      const result = await service.findById('user-id-123');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.id).toBe('user-id-123');
    });

    it('should return null if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should never expose passwordHash in response', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithoutPassword as any);

      const result = await service.findById('user-id-123');

      expect(result).not.toHaveProperty('passwordHash');
      expect(Object.keys(result || {})).not.toContain('passwordHash');
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      await service.updateLastLogin('user-id-123');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-123' },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Security: Password Hash Protection', () => {
    it('should never expose passwordHash in safe user method', async () => {
      const { passwordHash, ...userWithoutPassword } = mockUser;
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithoutPassword as any);

      const result = await service.findById('user-id-123');

      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
