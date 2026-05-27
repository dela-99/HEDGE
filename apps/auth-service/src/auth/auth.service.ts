import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
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
  role: UserRole;
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

  async register(input: { email: string; password: string; name?: string }, context: RequestContext) {
    const user = await this.usersService.createUser(input);
    return this.issueTokens(user, context, 'auth.register');
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    return isValid ? user : null;
  }

  async login(user: User, context: RequestContext) {
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

  private async issueTokens(user: User, context: RequestContext, action: string) {
    const session = await this.sessionsService.createSession({
      userId: user.id,
      expiresAt: this.refreshExpiry(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const tokens = await this.signTokens(user, session.id);
    await this.sessionsService.storeRefreshToken(session.id, tokens.refreshToken, session.expiresAt);

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

  private async signTokens(user: User, sessionId: string) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.accessTtl'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>('jwt.refreshTtl'),
      },
    );

    return { accessToken, refreshToken };
  }

  private refreshExpiry() {
    return new Date(Date.now() + durationToMs(this.configService.getOrThrow<string>('jwt.refreshTtl')));
  }

  private publicUser(user: User) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
