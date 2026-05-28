import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { AuditService } from '../../audit/audit.service';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(request: Request, email: string, password: string) {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      await this.auditService.logFailedLogin({
        ipAddress: request.ip,
        deviceInfo: this.userAgentFromRequest(request),
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private userAgentFromRequest(request: Request) {
    const userAgent = request.headers['user-agent'];

    if (typeof userAgent === 'string') {
      return userAgent;
    }

    if (Array.isArray(userAgent)) {
      return userAgent[0] ?? null;
    }

    return null;
  }
}
