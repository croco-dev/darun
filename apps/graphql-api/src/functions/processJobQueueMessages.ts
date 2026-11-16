import type { SQSRecord } from 'aws-lambda';

function parseBody(body: string): Record<string, unknown> {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error('Invalid SQS message body');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid SQS message body');
  }
  return payload as Record<string, unknown>;
}

export function isQueueId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function processJobQueueMessages(
  records: SQSRecord[],
  process: (payload: Record<string, unknown>) => Promise<void>
): Promise<void> {
  for (const record of records) {
    try {
      await process(parseBody(record.body));
    } catch (error) {
      console.error('SQS job message failed', {
        messageId: record.messageId,
        receiveCount: record.attributes?.ApproximateReceiveCount,
        queueArn: record.eventSourceARN,
      });
      throw error;
    }
  }
}
