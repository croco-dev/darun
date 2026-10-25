import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';

@Service()
export class ScreenshotCleanupQueueService {
  private readonly client = new SQSClient({
    region: process.env['AWS_REGION'] ?? 'ap-northeast-2',
  });

  async sendIntent(intentId: string): Promise<boolean> {
    const queueUrl = process.env['SCREENSHOT_CLEANUP_QUEUE_URL'];
    if (!queueUrl) return false;
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ intentId }),
      })
    );
    return true;
  }
}
