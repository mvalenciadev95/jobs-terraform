import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { ProcessingService } from './processing.service';

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly useLocalStack: boolean;
  private readonly maxConcurrency: number;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly processingService: ProcessingService,
  ) {
    this.useLocalStack =
      this.configService.get('USE_LOCALSTACK', 'false') === 'true';
    this.queueUrl = this.configService.get('SQS_QUEUE_URL', '');
    this.maxConcurrency = parseInt(
      this.configService.get('MAX_CONCURRENCY', '5'),
      10,
    );

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

  async onModuleInit() {
    this.logger.log('Starting queue consumer');
    this.isRunning = true;
    this.startPolling();
  }

  async onModuleDestroy() {
    this.logger.log('Stopping queue consumer');
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private async startPolling() {
    while (this.isRunning) {
      try {
        await this.pollMessages();
        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Error polling messages: ${error.message}`);
        await this.sleep(5000);
      }
    }
  }

  private async pollMessages() {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (!response.Messages || response.Messages.length === 0) {
        return;
      }

      this.logger.log(`Received ${response.Messages.length} messages`);

      const processingPromises = response.Messages.map((message) =>
        this.processMessage(message),
      );

      await Promise.allSettled(processingPromises);
    } catch (error) {
      if (error.name !== 'QueueDoesNotExist') {
        throw error;
      }
      this.logger.warn('Queue does not exist yet, will retry');
    }
  }

  private async processMessage(message: any) {
    const receiptHandle = message.ReceiptHandle;

    try {
      const messageBody = JSON.parse(message.Body);

      await this.processingService.processMessage(messageBody);

      await this.deleteMessage(receiptHandle);

      this.logger.debug(`Processed and deleted message: ${messageBody.id}`);
    } catch (error) {
      this.logger.error(`Failed to process message: ${error.message}`);

      const retryCount = parseInt(
        message.Attributes?.ApproximateReceiveCount || '0',
        10,
      );

      if (retryCount >= 3) {
        this.logger.error(
          `Message exceeded max retries, moving to DLQ: ${message.MessageId}`,
        );
        await this.deleteMessage(receiptHandle);
      }
    }
  }

  private async deleteMessage(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete message: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
