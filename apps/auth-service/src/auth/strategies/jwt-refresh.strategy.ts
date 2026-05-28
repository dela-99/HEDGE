import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthTokenPayload, isJwtPayload } from '../auth.types';
import { extractRefreshToken } from '../utils/refresh-token.util';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      secretOrKey: configService.getOrThrow('jwt.refreshSecret'),
      passReqToCallback: false,
    });
  }

  validate(payload: unknown): AuthTokenPayload {
    if (!isJwtPayload(payload)) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return payload;
  }
}
