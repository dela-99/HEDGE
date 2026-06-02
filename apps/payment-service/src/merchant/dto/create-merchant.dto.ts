import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
