import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LinkedAccountsController } from './linked-accounts.controller';
import { LinkedAccountsService } from './linked-accounts.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LinkedAccountsController],
  providers: [LinkedAccountsService],
  exports: [LinkedAccountsService],
})
export class LinkedAccountsModule {}
