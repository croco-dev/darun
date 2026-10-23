import { JOB_COMMIT_MARGIN_MS, workerDeadlineMs } from '@darun/utils-llm';
import type { Context } from 'aws-lambda';

export async function withJobDeadline<T>(
  context: Context,
  run: (options: { signal: AbortSignal; deadline: Date; stageBudgetMs: number }) => Promise<T>
): Promise<T | undefined> {
  const budget = workerDeadlineMs(context.getRemainingTimeInMillis());
  if (budget <= JOB_COMMIT_MARGIN_MS) return;
  const deadline = new Date(Date.now() + budget);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), budget);
  try {
    return await run({ signal: controller.signal, deadline, stageBudgetMs: budget - JOB_COMMIT_MARGIN_MS });
  } finally {
    clearTimeout(timeout);
  }
}
