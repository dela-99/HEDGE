import { Module } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma-client-payment';

@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [PrismaClient],
})
export class DatabaseModule {}
