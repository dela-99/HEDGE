import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(input: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    deviceInfo?: string | null;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo ?? undefined,
      },
    });
  }

  async revokeSession(sessionId: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revoked: true },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    return result.count;
  }

  async findSessionById(sessionId: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  async findSessionByRefreshToken(userId: string, refreshToken: string): Promise<Session | null> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const session of sessions) {
      if (await argon2.verify(session.refreshTokenHash, refreshToken)) {
        return session;
      }
    }

    return null;
  }

  async updateSessionActivity(
    sessionId: string,
    input: {
      refreshTokenHash?: string;
      ipAddress?: string;
      deviceInfo?: string | null;
      lastActiveAt?: Date;
    } = {},
  ): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: input.refreshTokenHash,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo ?? undefined,
        lastActiveAt: input.lastActiveAt ?? new Date(),
      },
    });
  }
}
