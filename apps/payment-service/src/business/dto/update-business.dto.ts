import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  @Length(2, 120)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  businessType?: string;

  @IsString()
  @IsOptional()
  @Length(2, 80)
  registrationNumber?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
