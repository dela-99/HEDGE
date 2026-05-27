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
    targetType?: string;
    targetId?: string;
    ipAddress?: string;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        sessionId: input.sessionId,
        targetType: input.targetType,
        targetId: input.targetId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent ?? undefined,
        metadata: input.metadata,
      },
    });
  }
}
