import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlProductResearchJobRepository } from '../repositories/PostgresqlProductResearchJobRepository';

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    requestKey: 'req-12345678',
    officialUrl: 'https://linear.app/',
    status: 'pending',
    stage: null,
    errorCode: null,
    errorMessage: null,
    resultJson: null,
    sourceSnapshotHash: null,
    promptVersion: null,
    model: null,
    leaseToken: null,
    leaseUntil: null,
    attemptCount: 0,
    materializedProductId: null,
    appliedAt: null,
    createdAt: new Date('2026-10-10T00:00:00Z'),
    updatedAt: new Date('2026-10-10T00:00:00Z'),
    ...overrides,
  };
}

function txWithRow(row: Record<string, unknown>, updateRows: Record<string, unknown>[] = []) {
  const limit = vi.fn().mockResolvedValue([row]);
  const whereSelect = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: whereSelect });
  const select = vi.fn().mockReturnValue({ from });
  const returning = vi.fn().mockResolvedValue(updateRows);
  const whereUpdate = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockReturnValue({ set });
  const tx = { select, update };
  return { tx, update, set };
}

describe('PostgresqlProductResearchJobRepository.claimJob attempt cap', () => {
  let transaction: ReturnType<typeof vi.fn>;
  let mockDb: { transaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    transaction = vi.fn();
    mockDb = { transaction };
  });

  it('fails an exhausted pending job without reclaiming', async () => {
    const expired = jobRow({ status: 'pending', attemptCount: 5 });
    const failed = jobRow({ status: 'failed', errorCode: 'RETRY_EXHAUSTED', attemptCount: 5 });
    const { tx: pendingTx, update, set } = txWithRow(expired, [failed]);
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(pendingTx));

    const repository = new PostgresqlProductResearchJobRepository(mockDb as never);
    const result = await repository.claimJob({
      jobId: 'job-1',
      leaseToken: 'lease-new',
      leaseUntil: new Date(Date.now() + 60_000),
      maxAttempts: 5,
    });

    expect(result.claimed).toBe(false);
    expect(result.job?.status).toBe('failed');
    expect(result.job?.errorCode).toBe('RETRY_EXHAUSTED');
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorCode: 'RETRY_EXHAUSTED' }));
  });

  it('fails an exhausted expired-lease reclaim without granting a new lease', async () => {
    const stranded = jobRow({
      status: 'in_progress',
      leaseToken: 'lease-old',
      leaseUntil: new Date(Date.now() - 60_000),
      attemptCount: 5,
    });
    const failed = jobRow({
      status: 'failed',
      leaseToken: null,
      leaseUntil: null,
      errorCode: 'RETRY_EXHAUSTED',
      attemptCount: 5,
    });
    const { tx: strandedTx, update, set } = txWithRow(stranded, [failed]);
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(strandedTx));

    const repository = new PostgresqlProductResearchJobRepository(mockDb as never);
    const result = await repository.claimJob({
      jobId: 'job-1',
      leaseToken: 'lease-new',
      leaseUntil: new Date(Date.now() + 60_000),
      maxAttempts: 5,
    });

    expect(result.claimed).toBe(false);
    expect(result.job?.status).toBe('failed');
    expect(result.job?.errorCode).toBe('RETRY_EXHAUSTED');
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorCode: 'RETRY_EXHAUSTED', leaseToken: null })
    );
  });

  it('fails an exhausted same-token reentry without granting another attempt', async () => {
    const active = jobRow({
      status: 'in_progress',
      leaseToken: 'lease-same',
      leaseUntil: new Date(Date.now() + 60_000),
      attemptCount: 5,
    });
    const failed = jobRow({
      status: 'failed',
      leaseToken: null,
      leaseUntil: null,
      errorCode: 'RETRY_EXHAUSTED',
      attemptCount: 5,
    });
    const { tx: activeTx, update, set } = txWithRow(active, [failed]);
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(activeTx));

    const repository = new PostgresqlProductResearchJobRepository(mockDb as never);
    const result = await repository.claimJob({
      jobId: 'job-1',
      leaseToken: 'lease-same',
      leaseUntil: new Date(Date.now() + 60_000),
      maxAttempts: 5,
    });

    expect(result.claimed).toBe(false);
    expect(result.job?.status).toBe('failed');
    expect(result.job?.errorCode).toBe('RETRY_EXHAUSTED');
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorCode: 'RETRY_EXHAUSTED', leaseToken: null })
    );
  });
});
