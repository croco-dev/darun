import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';

export type ProductDescriptionQueuePayload = {
  jobId: string;
  productId: string;
};

@Service()
export class ProductDescriptionQueueService {
  private sqsClient: SQSClient | null = null;

  private getClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: process.env['AWS_REGION'] || 'ap-northeast-2',
      });
    }
    return this.sqsClient;
  }

  async sendJob(payload: ProductDescriptionQueuePayload): Promise<boolean> {
    const queueUrl = process.env['PRODUCT_DESCRIPTION_QUEUE_URL'];

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
      console.error('[ProductDescriptionQueueService] Failed to send job to SQS queue:', error);
      throw error;
    }
  }
}
