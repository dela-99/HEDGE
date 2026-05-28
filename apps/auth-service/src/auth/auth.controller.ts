<<<<<<< HEAD
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
=======
import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
>>>>>>> 88168253c6d945180ddc96650ddd16287cf5323e
import type { User } from '@prisma/client';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
<<<<<<< HEAD
import { UsersService } from '../users/users.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
=======
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
>>>>>>> 88168253c6d945180ddc96650ddd16287cf5323e
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenPayload } from './auth.types';
import { extractRefreshToken } from './utils/refresh-token.util';

type RequestWithUser = Request & { user: User | AuthTokenPayload };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.contextFromRequest(request));
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Req() request: RequestWithUser, @Body() _dto: LoginDto) {
    return this.authService.login(request.user as User, this.contextFromRequest(request));
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Req() request: RequestWithUser, @Body() dto: RefreshTokenDto) {
    const refreshToken = extractRefreshToken(request) ?? dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshTokens(
      request.user as AuthTokenPayload,
      refreshToken,
      this.contextFromRequest(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  logout(@Req() request: RequestWithUser) {
    return this.authService.logout(
      request.user as AuthTokenPayload,
      this.contextFromRequest(request),
      extractRefreshToken(request) ?? undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthTokenPayload) {
    return this.authService.currentUser(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload) {
    return this.usersService.findById(user.sub);
  }

  private contextFromRequest(request: Request) {
    return {
      ipAddress: request.ip,
      deviceInfo: this.deviceInfoFromRequest(request),
    };
  }

  private deviceInfoFromRequest(request: Request) {
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
