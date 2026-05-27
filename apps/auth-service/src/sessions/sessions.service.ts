import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { REDIS_CLIENT } from '../database/database.constants';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async createSession(input: {
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string | null;
  }) {
    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent ?? undefined,
      },
    });

    await this.redis.set(this.cacheKey(session.id), JSON.stringify({ userId: session.userId }), 'EX', this.ttlSeconds(session.expiresAt));
    return session;
  }

  async storeRefreshToken(sessionId: string, refreshToken: string, expiresAt: Date) {
    const refreshTokenHash = await argon2.hash(refreshToken);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        lastSeenAt: new Date(),
        expiresAt,
      },
    });
  }

  async assertActiveSession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is not active');
    }

    return session;
  }

  async rotateRefreshToken(sessionId: string, refreshToken: string, expiresAt: Date) {
    const refreshTokenHash = await argon2.hash(refreshToken);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash,
        rotatedAt: new Date(),
        lastSeenAt: new Date(),
        expiresAt,
      },
    });
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.redis.del(this.cacheKey(sessionId));
  }

  private cacheKey(sessionId: string) {
    return `hedge:session:${sessionId}`;
  }

  private ttlSeconds(expiresAt: Date) {
    return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }
}
