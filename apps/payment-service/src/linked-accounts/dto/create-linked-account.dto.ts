import { IsEnum, IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';
import {
  LinkedAccountStatus,
  PaymentProvider,
} from '../../../../generated/prisma-client-payment';

export class CreateLinkedAccountDto {
  @IsUUID()
  @IsNotEmpty()
  merchantId!: string;

  @IsUUID()
  @IsNotEmpty()
  businessId!: string;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsString()
  @IsNotEmpty()
  @Length(3, 128)
  providerAccountId!: string;

  @IsEnum(LinkedAccountStatus)
  status: LinkedAccountStatus = LinkedAccountStatus.PENDING;
}
