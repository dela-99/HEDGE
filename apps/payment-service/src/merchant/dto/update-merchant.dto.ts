import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
