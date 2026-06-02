import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post('invite')
  async inviteMember(@Body() inviteMemberDto: InviteMemberDto) {
    return this.teamService.inviteMember(inviteMemberDto);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateRole(id, updateMemberRoleDto);
  }

  @Delete(':id')
  async removeMember(@Param('id', ParseUUIDPipe) id: string) {
    return this.teamService.removeMember(id);
  }

  @Get('business/:businessId')
  async listMembers(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.teamService.listMembers(businessId);
  }
}
