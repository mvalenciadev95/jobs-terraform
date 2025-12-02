import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';
import { QueueConsumerService } from './queue-consumer.service';
import { StorageService } from './storage.service';
import {
  CuratedRecord,
  CuratedRecordSchema,
} from './schemas/curated-record.schema';
import {
  ProcessingRecord,
  ProcessingRecordSchema,
} from './schemas/processing-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CuratedRecord.name, schema: CuratedRecordSchema },
      { name: ProcessingRecord.name, schema: ProcessingRecordSchema },
    ]),
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService, QueueConsumerService, StorageService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
