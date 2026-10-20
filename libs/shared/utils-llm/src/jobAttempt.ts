export const JOB_MAX_ATTEMPTS = 3;
export const JOB_LEASE_MS = 300_000;
export const JOB_COMMIT_MARGIN_MS = 15_000;
export const JOB_DISPATCH_RESERVATION_MS = 60_000;

export function jobRetryDelay(attemptCount: number): number {
  return attemptCount === 1 ? 30_000 : 120_000;
}

/** These are DB scheduling states, never claims about an SQS acknowledgement. */
export function jobDispatchStatus(
  job: {
    status: string;
    runNotBefore?: Date;
    nextDispatchAt?: Date;
    leaseUntil?: Date | null;
  },
  now = new Date()
): string {
  if (job.status === 'in_progress') return job.leaseUntil && job.leaseUntil > now ? 'RUNNING' : 'RECOVERY_DUE';
  if (job.status !== 'pending') return job.status.toUpperCase();
  if (job.runNotBefore && job.runNotBefore > now) return 'BACKOFF';
  return job.nextDispatchAt && job.nextDispatchAt > now ? 'DISPATCH_RESERVED' : 'DUE';
}

export function workerDeadlineMs(remainingTimeMs: number): number {
  return Math.max(0, Math.min(270_000, remainingTimeMs - 30_000));
}
