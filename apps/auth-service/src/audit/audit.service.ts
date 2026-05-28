import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditAction = 'signup' | 'login' | 'logout' | 'failed_login' | 'refresh';

type AuditContext = {
  actorId?: string;
  ipAddress?: string;
  deviceInfo?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logSignup(input: AuditContext) {
    return this.record('signup', input);
  }

  async logLogin(input: AuditContext) {
    return this.record('login', input);
  }

  async logLogout(input: AuditContext) {
    return this.record('logout', input);
  }

  async logFailedLogin(input: AuditContext) {
    return this.record('failed_login', input);
  }

  async logRefresh(input: AuditContext) {
    return this.record('refresh', input);
  }

  private async record(action: AuditAction, input: AuditContext) {
    return this.prisma.auditLog.create({
      data: {
        action,
        actorId: input.actorId,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo ?? undefined,
        metadata: input.metadata,
      },
    });
  }
}
