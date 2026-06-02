import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateBusinessDto {
  @IsUUID()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  businessType!: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  registrationNumber?: string;
}
