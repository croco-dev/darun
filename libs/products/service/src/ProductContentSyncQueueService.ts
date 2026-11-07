import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';
import { RecoverySqsClient } from './RecoverySqsClient';

@Service()
export class ProductContentSyncQueueService {
  private readonly client = new SQSClient({
    region: process.env['AWS_REGION'] ?? 'ap-northeast-2',
  });
  private readonly recoveryClient = new RecoverySqsClient();
  async sendIntent(intentId: string, signal?: AbortSignal): Promise<boolean> {
    const queueUrl = process.env['PRODUCT_CONTENT_SYNC_QUEUE_URL'];
    if (!queueUrl) return false;
    // Keep normal callers' retry policy; recovery retransmits on a later tick.
    const client = signal ? this.recoveryClient.get(process.env['AWS_REGION'] ?? 'ap-northeast-2') : this.client;
    await client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ intentId }),
      }),
      { abortSignal: signal }
    );
    return true;
  }
}
