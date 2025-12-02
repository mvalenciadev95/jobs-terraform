import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly useLocalStack: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useLocalStack =
      this.configService.get('USE_LOCALSTACK', 'false') === 'true';
    this.queueUrl = this.configService.get('SQS_QUEUE_URL', '');

    const sqsConfig: any = {
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    };

    if (this.useLocalStack) {
      sqsConfig.endpoint = this.configService.get(
        'SQS_ENDPOINT',
        'http://localhost:4566',
      );
      sqsConfig.credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      };
    }

    this.sqsClient = new SQSClient(sqsConfig);
  }

  async publishMessage(message: any): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          Source: {
            DataType: 'String',
            StringValue: message.source,
          },
        },
      });

      await this.sqsClient.send(command);
      this.logger.debug(`Published message to queue: ${message.id}`);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`);
      throw error;
    }
  }
}
