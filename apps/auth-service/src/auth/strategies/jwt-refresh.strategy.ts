import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AppConfiguration } from '../../config/configuration';

const refreshExtractor = (request: Request): string | null => {
  const token = request.body?.refreshToken;
  return typeof token === 'string' && token.length ? token : null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshExtractor]),
      secretOrKey: configService.getOrThrow('jwt.refreshSecret'),
      passReqToCallback: false,
    });
  }

  validate(payload: Record<string, unknown>) {
    return payload;
  }
}
