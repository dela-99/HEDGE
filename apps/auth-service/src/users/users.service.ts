import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const email = this.normalizeEmail(input.email);
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
    return this.prisma.user.findUnique({ where: { email: this.normalizeEmail(email) } });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.publicUser(user);
  }

  async updateProfile(userId: string, input: { name?: string }) {
    if (!Object.keys(input).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    let user: User;
    try {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: input,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('User not found');
      }

      throw error;
    }

    await this.auditService.record({
      action: 'users.update-profile',
      userId,
      targetType: 'User',
      targetId: userId,
      metadata: { changedFields: Object.keys(input), before: { name: currentUser.name }, after: input } satisfies Prisma.InputJsonValue,
    });

    return this.publicUser(user);
  }

  private publicUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
