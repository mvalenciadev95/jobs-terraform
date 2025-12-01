import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { StorageService } from './storage.service';
import { QueueService } from './queue.service';
import { DataSourceService } from './data-source.service';

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, StorageService, QueueService, DataSourceService],
  exports: [IngestionService],
})
export class IngestionModule {}



