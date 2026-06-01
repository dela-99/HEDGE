import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { WebhookVerifierService } from './webhook-verifier.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [WebhookVerifierService],
  exports: [WebhookVerifierService],
})
export class WebhookVerifierModule {}
