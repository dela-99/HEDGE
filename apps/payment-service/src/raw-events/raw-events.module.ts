import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RawEventsService } from './raw-events.service';

@Module({
  imports: [DatabaseModule],
  providers: [RawEventsService],
  exports: [RawEventsService],
})
export class RawEventsModule {}
