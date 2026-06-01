import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class MtnWebhookDto {
  @IsString()
  notificationType!: string;

  @IsString()
  transactionId!: string;

  @IsString()
  externalId!: string;

  @IsString()
  status!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsObject()
  payer?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  payee?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  recipient?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sender?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  requestTimestamp?: string;
}
