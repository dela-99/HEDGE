import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './database.constants';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('RedisClient');
    const url = configService.getOrThrow<string>('redis.url');
    const client = new Redis(url, { lazyConnect: true });

    client.on('error', (error) => logger.error(error));
    client.on('connect', () => logger.log('connected'));
    client.on('reconnecting', () => logger.warn('reconnecting'));

    return client;
  },
};
