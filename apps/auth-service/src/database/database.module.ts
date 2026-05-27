import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { REDIS_CLIENT } from './database.constants';
import { redisProvider } from './redis.provider';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [redisProvider],
  exports: [PrismaModule, REDIS_CLIENT],
})
export class DatabaseModule {}
