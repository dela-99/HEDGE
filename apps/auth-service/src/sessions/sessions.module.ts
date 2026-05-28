import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../database/redis.module';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
