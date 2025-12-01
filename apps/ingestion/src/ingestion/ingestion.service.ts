import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageService } from './storage.service';
import { QueueService } from './queue.service';
import { DataSourceService } from './data-source.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly dataSourceService: DataSourceService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledIngestion() {
    this.logger.log('Starting scheduled ingestion');
    await this.ingestAllSources();
  }

  async ingestAllSources() {
    const sources = this.dataSourceService.getSources();
    
    for (const source of sources) {
      try {
        await this.ingestSource(source.id);
      } catch (error) {
        this.logger.error(`Failed to ingest source ${source.id}: ${error.message}`);
      }
    }
  }

  async ingestSource(sourceId: string) {
    this.logger.log(`Ingesting data from source: ${sourceId}`);
    
    const source = this.dataSourceService.getSource(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    const data = await this.dataSourceService.fetchData(source);
    
    const ingestDate = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    
    for (const item of data) {
      const itemId = `${sourceId}-${item.id || timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      
      const rawPayload = {
        id: itemId,
        source: sourceId,
        ingestedAt: new Date().toISOString(),
        ingestDate,
        payload: item,
      };

      const s3Key = await this.storageService.storeRaw(
        sourceId,
        ingestDate,
        itemId,
        rawPayload,
      );

      await this.queueService.publishMessage({
        id: itemId,
        source: sourceId,
        s3Key,
        ingestedAt: rawPayload.ingestedAt,
        payloadHash: this.hashPayload(item),
      });

      this.logger.debug(`Ingested item ${itemId} from ${sourceId}`);
    }

    this.logger.log(`Completed ingestion for source: ${sourceId}, items: ${data.length}`);
  }

  private hashPayload(payload: any): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}



