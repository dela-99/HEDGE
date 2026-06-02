import { IsEnum, IsOptional } from 'class-validator';
import { LinkedAccountStatus } from '../../../../generated/prisma-client-payment';

export class UpdateLinkedAccountDto {
  @IsEnum(LinkedAccountStatus)
  @IsOptional()
  status?: LinkedAccountStatus;
}
