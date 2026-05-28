import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { REDIS_CLIENT } from './database.constants';
import { redisProvider } from './redis.provider';

@Module({
  imports: [ConfigModule],
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
