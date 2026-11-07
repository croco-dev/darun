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
  private recoveryClient: SQSClient | null = null;

  private getClient(signal?: AbortSignal): SQSClient {
    if (signal) {
      // SDK retry backoff ignores AbortSignal; the recovery tick owns retransmission.
      this.recoveryClient ??= new SQSClient({
        region: process.env['AWS_REGION'] || 'ap-northeast-2',
        maxAttempts: 1,
      });
      return this.recoveryClient;
    }
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: process.env['AWS_REGION'] || 'ap-northeast-2',
      });
    }
    return this.sqsClient;
  }

  async sendJob(payload: TranslationQueuePayload, signal?: AbortSignal): Promise<boolean> {
    const queueUrl = process.env['TRANSLATION_QUEUE_URL'];

    if (!queueUrl) {
      // Local development or test environment without SQS configured
      return false;
    }

    try {
      const client = this.getClient(signal);
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(payload),
        }),
        { abortSignal: signal }
      );
      return true;
    } catch (error) {
      console.error('[TranslationQueueService] Failed to send job to SQS queue:', error);
      throw error;
    }
  }
}
