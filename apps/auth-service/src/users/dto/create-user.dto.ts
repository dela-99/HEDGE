import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @Type(() => String)
  @IsEmail()
  email!: string;

  @Type(() => String)
  @IsString()
  @MinLength(8)
  passwordHash!: string;

  @Type(() => String)
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
