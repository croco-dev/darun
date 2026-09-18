import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';

vi.hoisted(() => {
  process.env.VOTE_IP_SALT = 'test-salt';
});

const { mockClearAll } = vi.hoisted(() => ({
  mockClearAll: vi.fn(),
}));

vi.mock('dataloader', () => ({
  default: vi.fn(function () {
    return {
      load: vi.fn(),
      clearAll: mockClearAll,
    };
  }),
}));

describe('PostgresqlProductScreenshotRepository', () => {
  const mockTx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };

  const mockDb = {
    transaction: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('should call clearAll() after insert()', async () => {
    const repo = new PostgresqlProductScreenshotRepository(mockDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const row = {
      id: 'test-1',
      productId: 'product-1',
      imageUrl: 'https://example.com/img.png',
      imageAlt: 'Test image',
      title: null,
      platform: null,
      screenType: null,
    };

    mockTx.returning.mockResolvedValue([row]);

    const result = await repo.insert(row as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(result).toEqual(row);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it('should call clearAll() after deleteById()', async () => {
    const repo = new PostgresqlProductScreenshotRepository(mockDb as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    await repo.deleteById('screenshot-1');

    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });
});
