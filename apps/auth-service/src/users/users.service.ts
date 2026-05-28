import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  mfaEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const userWithPasswordSelect = {
  ...safeUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
type UserWithPassword = Prisma.UserGetPayload<{ select: typeof userWithPasswordSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: { email: string; passwordHash: string; role?: Role }): Promise<SafeUser> {
    const email = this.normalizeEmail(input.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        role: input.role ?? Role.merchant_owner,
      },
      select: safeUserSelect,
    });
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: userWithPasswordSelect,
    });
  }

  async findById(userId: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
