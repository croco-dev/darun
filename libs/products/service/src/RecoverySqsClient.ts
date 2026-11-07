import { SQSClient } from '@aws-sdk/client-sqs';

/** The recovery tick owns retransmission; SDK backoff does not observe AbortSignal. */
export class RecoverySqsClient {
  private client: SQSClient | null = null;

  get(region: string): SQSClient {
    if (!this.client) {
      this.client = new SQSClient({ region, maxAttempts: 1 });
    }
    return this.client;
  }
}
