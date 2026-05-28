import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { durationToMs } from '../common/utils/duration.util';
import { AuditService } from '../audit/audit.service';
import { AuthTokenPayload } from './auth.types';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

type RequestContext = {
  ipAddress: string | undefined;
  deviceInfo: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: { email: string; password: string }, context: RequestContext) {
    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersService.createUser({
      email: input.email,
      passwordHash,
    });
    return this.issueTokens(user, context, 'signup');
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    return isValid ? user : null;
  }

  async login(user: Pick<User, 'id' | 'email' | 'role'>, context: RequestContext) {
    return this.issueTokens(user, context, 'login');
  }

  async refreshTokens(payload: AuthTokenPayload, refreshToken: string, context: RequestContext) {
    const session = await this.sessionsService.findSessionByRefreshToken(payload.sub, refreshToken);

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is not active');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const tokens = await this.signTokens(user);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.sessionsService.updateSessionActivity(session.id, {
      refreshTokenHash,
      lastActiveAt: new Date(),
      ipAddress: context.ipAddress,
      deviceInfo: context.deviceInfo,
    });

    await this.auditService.logRefresh({
      actorId: user.id,
      ipAddress: context.ipAddress,
      deviceInfo: context.deviceInfo,
      metadata: { sessionId: session.id },
    });

    return {
      user: this.publicUser(user),
      sessionId: session.id,
      ...tokens,
    };
  }

  async logout(payload: AuthTokenPayload, context: RequestContext, refreshToken?: string) {
    const session = refreshToken
      ? await this.sessionsService.findSessionByRefreshToken(payload.sub, refreshToken)
      : null;

    const revokedSessions = session
      ? 1
      : await this.sessionsService.revokeAllUserSessions(payload.sub);

    if (session) {
      await this.sessionsService.revokeSession(session.id);
    }

    await this.auditService.logLogout({
      actorId: payload.sub,
      ipAddress: context.ipAddress,
      deviceInfo: context.deviceInfo,
      metadata: session ? { sessionId: session.id } : { revokedSessions },
    });

    return { success: true };
  }

  async currentUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async issueTokens(user: Pick<User, 'id' | 'email' | 'role'>, context: RequestContext, action: 'signup' | 'login') {
    const sessionId = randomUUID();
    const tokens = await this.signTokens(user);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    const session = await this.sessionsService.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt: this.refreshExpiry(),
      ipAddress: context.ipAddress,
      deviceInfo: context.deviceInfo,
    });

    await this.usersService.updateLastLogin(user.id);

    if (action === 'signup') {
      await this.auditService.logSignup({
        actorId: user.id,
        ipAddress: context.ipAddress,
        deviceInfo: context.deviceInfo,
        metadata: { sessionId: session.id },
      });
    } else {
      await this.auditService.logLogin({
        actorId: user.id,
        ipAddress: context.ipAddress,
        deviceInfo: context.deviceInfo,
        metadata: { sessionId: session.id },
      });
    }

    return {
      user: this.publicUser(user),
      sessionId: session.id,
      ...tokens,
    };
  }

  private async signTokens(user: Pick<User, 'id' | 'email' | 'role'>) {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow('jwt.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }

  private refreshExpiry() {
    return new Date(Date.now() + durationToMs(this.configService.getOrThrow('jwt.refreshExpiresIn')));
  }

  private publicUser(user: object) {
    const { passwordHash: _passwordHash, ...safeUser } = user as { passwordHash?: unknown } & Record<string, unknown>;
    return safeUser;
  }
}
