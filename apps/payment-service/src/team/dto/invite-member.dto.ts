import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { BusinessRole } from '../../../../generated/prisma-client-payment';

export class InviteMemberDto {
  @IsUUID()
  @IsNotEmpty()
  businessId!: string;

  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(BusinessRole)
  role: BusinessRole = BusinessRole.VIEWER;
}
