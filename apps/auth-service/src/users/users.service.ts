import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.publicUser(user);
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
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (input.name === undefined) {
      return this.publicUser(currentUser);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
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
