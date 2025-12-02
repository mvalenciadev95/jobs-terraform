import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly useLocalStack: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useLocalStack =
      this.configService.get('USE_LOCALSTACK', 'false') === 'true';
    this.bucketName = this.configService.get('S3_BUCKET_NAME', 'twl-raw-data');

    const s3Config: any = {
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    };

    if (this.useLocalStack) {
      s3Config.endpoint = this.configService.get(
        'S3_ENDPOINT',
        'http://localhost:9000',
      );
      s3Config.forcePathStyle = true;
      s3Config.credentials = {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      };
    }

    this.s3Client = new S3Client(s3Config);
  }

  async storeRaw(
    source: string,
    ingestDate: string,
    itemId: string,
    payload: any,
  ): Promise<string> {
    const key = `raw/source=${source}/ingest_date=${ingestDate}/${itemId}.json`;

    try {
      const commandParams: any = {
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(payload, null, 2),
        ContentType: 'application/json',
      };

      if (!this.useLocalStack) {
        commandParams.ServerSideEncryption = 'AES256';
      }

      const command = new PutObjectCommand(commandParams);

      await this.s3Client.send(command);
      this.logger.debug(`Stored raw data: ${key}`);

      return key;
    } catch (error) {
      this.logger.error(`Failed to store raw data: ${error.message}`);
      throw error;
    }
  }
}
