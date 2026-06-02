import { IsString, IsNotEmpty, IsUUID, Length } from 'class-validator';

export class CreateBusinessDto {
  @IsUUID()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  industry!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2) // ISO Country Code
  country!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;
}