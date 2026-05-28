import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createUser(input: { email: string; password: string; name?: string }) {
    const email = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
      },
    });

    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.publicUser(user);
  }

  async updateProfile(userId: string, input: { name?: string }) {
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (!Object.keys(input).length) {
      return this.publicUser(currentUser);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: input,
    });

    await this.auditService.record({
      action: 'users.update-profile',
      userId,
      targetType: 'User',
      targetId: userId,
      metadata: { changedFields: Object.keys(input) } satisfies Prisma.InputJsonValue,
    });

    return this.publicUser(user);
  }

  private publicUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
