import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Service } from 'typedi';

@Service()
export class ScreenshotCleanupQueueService {
  private readonly client = new SQSClient({
    region: process.env['AWS_REGION'] ?? 'ap-northeast-2',
  });

  private recoveryClient: SQSClient | null = null;
  async sendIntent(intentId: string, signal?: AbortSignal): Promise<boolean> {
    const queueUrl = process.env['SCREENSHOT_CLEANUP_QUEUE_URL'];
    if (!queueUrl) return false;
    // Keep normal callers' retry policy; recovery retransmits on a later tick.
    const client = signal
      ? (this.recoveryClient ??= new SQSClient({
          region: process.env['AWS_REGION'] ?? 'ap-northeast-2',
          maxAttempts: 1,
        }))
      : this.client;
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
