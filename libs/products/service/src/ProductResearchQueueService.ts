import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';
import { RecoverySqsClient } from './RecoverySqsClient';

export type ProductResearchQueuePayload = {
  jobId: string;
};

@Service()
export class ProductResearchQueueService {
  private sqsClient: SQSClient | null = null;
  private readonly recoveryClient = new RecoverySqsClient();

  private getClient(): SQSClient {
    if (!this.sqsClient) {
      this.sqsClient = new SQSClient({
        region: process.env['AWS_REGION'] || 'ap-northeast-2',
      });
    }
    return this.sqsClient;
  }

  async sendJob(payload: ProductResearchQueuePayload, signal?: AbortSignal): Promise<boolean> {
    const queueUrl = process.env['PRODUCT_RESEARCH_QUEUE_URL'];
    if (!queueUrl) {
      return false;
    }
    try {
      const client = signal ? this.recoveryClient.get(process.env['AWS_REGION'] || 'ap-northeast-2') : this.getClient();
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(payload),
        }),
        { abortSignal: signal }
      );
      return true;
    } catch (error) {
      console.error('[ProductResearchQueueService] Failed to send job to SQS queue:', error);
      throw error;
    }
  }
}
