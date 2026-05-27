import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('USER', 'ADMIN', 'COMPLIANCE', 'SUPPORT')
  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload) {
    return this.usersService.findById(user.sub);
  }

  @Roles('USER', 'ADMIN', 'COMPLIANCE', 'SUPPORT')
  @Patch('me')
  async updateMe(@CurrentUser() user: AuthTokenPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }
}
