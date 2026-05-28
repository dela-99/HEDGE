import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { durationToMs } from '../common/utils/duration.util';
import { AuditService } from '../audit/audit.service';
import { AuthTokenPayload } from './auth.types';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

type RequestContext = {
  ipAddress: string | undefined;
  userAgent: string | null;
};

type TokenPayload = {
  sub: string;
  email: string;
  role: Role;
  sid: string;
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
    return this.issueTokens(user, context, 'auth.register');
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
    return this.issueTokens(user, context, 'auth.login');
  }

  async refreshTokens(payload: AuthTokenPayload, refreshToken: string, context: RequestContext) {
    const userId = payload.sub;
    const sessionId = payload.sid;
    const session = await this.sessionsService.assertActiveSession(sessionId, userId);

    if (!session.refreshTokenHash) {
      throw new UnauthorizedException('Session is not initialized');
    }

    const matches = await argon2.verify(session.refreshTokenHash, refreshToken);

    if (!matches) {
      await this.sessionsService.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const tokens = await this.signTokens(user, session.id);
    await this.sessionsService.rotateRefreshToken(session.id, tokens.refreshToken, this.refreshExpiry());

    await this.auditService.record({
      action: 'auth.refresh',
      userId: user.id,
      sessionId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      user: this.publicUser(user),
      sessionId: session.id,
      ...tokens,
    };
  }

  async logout(payload: AuthTokenPayload) {
    const sessionId = payload.sid;
    const userId = payload.sub;
    await this.sessionsService.revokeSession(sessionId);

    await this.auditService.record({
      action: 'auth.logout',
      userId,
      sessionId,
    });

    return { success: true };
  }

  private async issueTokens(user: Pick<User, 'id' | 'email' | 'role'>, context: RequestContext, action: string) {
    const sessionId = randomUUID();
    const tokens = await this.signTokens(user, sessionId);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    const session = await this.sessionsService.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt: this.refreshExpiry(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    if (action !== 'auth.refresh') {
      await this.usersService.updateLastLogin(user.id);
    }

    await this.auditService.record({
      action,
      userId: user.id,
      sessionId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      user: this.publicUser(user),
      sessionId: session.id,
      ...tokens,
    };
  }

  private async signTokens(user: Pick<User, 'id' | 'email' | 'role'>, sessionId: string) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' },
      {
        secret: this.configService.getOrThrow('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow('jwt.refreshExpiresIn'),
      },
    );

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
