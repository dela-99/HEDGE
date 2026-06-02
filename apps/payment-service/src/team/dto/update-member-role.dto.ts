import { IsEnum } from 'class-validator';
import { BusinessRole } from '../../../../generated/prisma-client-payment';

export class UpdateMemberRoleDto {
  @IsEnum(BusinessRole)
  role!: BusinessRole;
}
