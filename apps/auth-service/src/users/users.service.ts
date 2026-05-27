import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: { email: string; password: string; name?: string }) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: input,
    });

    return this.publicUser(user);
  }

  private publicUser(user: User) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
