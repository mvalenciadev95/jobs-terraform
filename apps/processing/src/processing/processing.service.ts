import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CuratedRecord } from './schemas/curated-record.schema';
import { ProcessingRecord } from './schemas/processing-record.schema';
import { StorageService } from './storage.service';

export interface ProcessMessage {
  id: string;
  source: string;
  s3Key: string;
  ingestedAt: string;
  payloadHash: string;
}

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    @InjectModel(CuratedRecord.name)
    private readonly curatedRecordModel: Model<CuratedRecord>,
    @InjectModel(ProcessingRecord.name)
    private readonly processingRecordModel: Model<ProcessingRecord>,
    private readonly storageService: StorageService,
  ) {}

  async processMessage(message: ProcessMessage): Promise<void> {
    this.logger.log(`Processing message: ${message.id}`);

    const existingProcessing = await this.processingRecordModel.findOne({
      messageId: message.id,
    });

    if (existingProcessing && existingProcessing.status === 'completed') {
      this.logger.warn(`Message ${message.id} already processed, skipping`);
      return;
    }

    try {
      await this.processingRecordModel.findOneAndUpdate(
        { messageId: message.id },
        {
          messageId: message.id,
          status: 'processing',
          startedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      const rawData = await this.storageService.getRawData(message.s3Key);
      
      const curatedData = this.transformData(rawData, message);
      
      const fingerprint = this.generateFingerprint(curatedData);
      
      const existingCurated = await this.curatedRecordModel.findOne({
        fingerprint,
      });

      if (existingCurated) {
        this.logger.warn(`Duplicate detected for fingerprint: ${fingerprint}`);
        await this.processingRecordModel.findOneAndUpdate(
          { messageId: message.id },
          {
            status: 'completed',
            completedAt: new Date(),
            dedupStatus: 'duplicate',
            curatedRecordId: existingCurated._id.toString(),
          },
        );
        return;
      }

      const curatedRecord = new this.curatedRecordModel({
        ...curatedData,
        fingerprint,
        dedupStatus: 'unique',
        processedAt: new Date(),
      });

      await curatedRecord.save();

      await this.processingRecordModel.findOneAndUpdate(
        { messageId: message.id },
        {
          status: 'completed',
          completedAt: new Date(),
          dedupStatus: 'unique',
          curatedRecordId: curatedRecord._id.toString(),
        },
      );

      this.logger.log(`Successfully processed message: ${message.id}`);
    } catch (error) {
      this.logger.error(`Failed to process message ${message.id}: ${error.message}`);
      
      await this.processingRecordModel.findOneAndUpdate(
        { messageId: message.id },
        {
          status: 'failed',
          error: error.message,
          failedAt: new Date(),
        },
      );

      throw error;
    }
  }

  private transformData(rawData: any, message: ProcessMessage): any {
    const payload = rawData.payload || {};
    
    return {
      sourceId: message.source,
      originalId: message.id,
      capturedAt: new Date(rawData.ingestedAt || message.ingestedAt),
      rawDataUri: message.s3Key,
      normalizedFields: {
        title: payload.title || payload.name || 'Untitled',
        content: payload.body || payload.content || payload.description || '',
        author: payload.userId || payload.email || 'unknown',
        metadata: {
          sourceType: rawData.source,
          ingestDate: rawData.ingestDate,
        },
      },
    };
  }

  private generateFingerprint(data: any): string {
    const str = JSON.stringify({
      source: data.sourceId,
      title: data.normalizedFields.title,
      content: data.normalizedFields.content,
      author: data.normalizedFields.author,
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  async reprocessFromRaw(s3Key: string): Promise<void> {
    this.logger.log(`Reprocessing from raw data: ${s3Key}`);
    
    const rawData = await this.storageService.getRawData(s3Key);
    
    const message: ProcessMessage = {
      id: rawData.id,
      source: rawData.source,
      s3Key,
      ingestedAt: rawData.ingestedAt,
      payloadHash: this.hashPayload(rawData.payload),
    };

    await this.processMessage(message);
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



