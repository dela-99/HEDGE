import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
