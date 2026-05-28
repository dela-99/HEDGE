import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    action: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    const metadata = input.metadata ?? (input.sessionId ? { sessionId: input.sessionId } : undefined);

    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.userId,
        ipAddress: input.ipAddress,
        deviceInfo: input.userAgent ?? undefined,
        metadata,
      },
    });
  }
}
