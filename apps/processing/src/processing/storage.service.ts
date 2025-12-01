import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

  async getRawData(s3Key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      const body = await response.Body.transformToString();

      return JSON.parse(body);
    } catch (error) {
      this.logger.error(
        `Failed to get raw data from ${s3Key}: ${error.message}`,
      );
      throw error;
    }
  }
}
