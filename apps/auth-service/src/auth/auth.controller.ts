import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenPayload } from './auth.types';

type RequestWithUser = Request & { user: User | AuthTokenPayload };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.contextFromRequest(request));
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() request: RequestWithUser, @Body() _dto: LoginDto) {
    return this.authService.login(request.user as User, this.contextFromRequest(request));
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() request: RequestWithUser, @Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(
      request.user as AuthTokenPayload,
      dto.refreshToken,
      this.contextFromRequest(request),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() request: RequestWithUser) {
    return this.authService.logout(request.user as AuthTokenPayload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload) {
    return this.usersService.findById(user.sub);
  }

  private contextFromRequest(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    };
  }
}
