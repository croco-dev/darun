import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';

export type TranslationQueuePayload = {
  jobId: string;
  entityType: 'Product' | 'Magazine' | 'ProductFeature';
  entityId: string;
};

@Service()
export class TranslationQueueService {
  private sqsClient: SQSClient | null = null;

  private getClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: process.env['AWS_REGION'] || 'ap-northeast-2',
      });
    }
    return this.sqsClient;
  }

  async sendJob(payload: TranslationQueuePayload): Promise<boolean> {
    const queueUrl = process.env['TRANSLATION_QUEUE_URL'];

    if (!queueUrl) {
      // Local development or test environment without SQS configured
      return false;
    }

    try {
      const client = this.getClient();
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(payload),
        })
      );
      return true;
    } catch (error) {
      console.error('[TranslationQueueService] Failed to send job to SQS queue:', error);
      throw error;
    }
  }
}
