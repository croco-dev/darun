import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostgresqlProductScreenshotRepository } from '../repositories/PostgresqlProductScreenshotRepository';

vi.hoisted(() => {
  process.env.VOTE_IP_SALT = 'test-salt';
});

vi.mock('dataloader', () => ({
  default: vi.fn(function () {
    return {
      load: vi.fn(),
      clearAll: vi.fn(),
    };
  }),
}));

function extractSqlString(sqlObj: unknown): string {
  if (!sqlObj || typeof sqlObj !== 'object') return '';
  const obj = sqlObj as Record<string, unknown>;
  if (Array.isArray(obj.value)) return obj.value.join('');
  if (Array.isArray(obj.queryChunks)) return obj.queryChunks.map((chunk: unknown) => extractSqlString(chunk)).join('');
  return '';
}

describe('PostgresqlProductScreenshotRepository UI 요소 태그', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaceScreenshotUiElements는 닫힌 집합 밖 값을 거절한다', async () => {
    const mockDb = { transaction: vi.fn() };
    const repo = new PostgresqlProductScreenshotRepository(mockDb as never);

    await expect(repo.replaceScreenshotUiElements('screenshot-1', ['SIDEBAR'])).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('findScreenshotUiElementsByScreenshotIds는 스크린샷별로 element 목록을 묶어 반환한다', async () => {
    const orderBy = vi.fn().mockResolvedValue([
      { screenshotId: 's-1', element: 'BUTTON' },
      { screenshotId: 's-1', element: 'CARD' },
      { screenshotId: 's-2', element: 'MODAL' },
    ]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const mockDb = { select: vi.fn().mockReturnValue({ from }) };
    const repo = new PostgresqlProductScreenshotRepository(mockDb as never);

    const result = await repo.findScreenshotUiElementsByScreenshotIds(['s-1', 's-2', 's-3']);

    expect(result).toEqual({ 's-1': ['BUTTON', 'CARD'], 's-2': ['MODAL'], 's-3': [] });
  });

  it('uiElements 필터는 AND 의미의 EXISTS 조건을 생성한다', async () => {
    const where = vi.fn();
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    where.mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const selectFrom = vi.fn().mockReturnValue({ innerJoin });
    const mockDb = { select: vi.fn().mockReturnValue({ from: selectFrom }) };
    const repo = new PostgresqlProductScreenshotRepository(mockDb as never);

    await repo.findManyVisualPublishedByFilterAndAfterIdAndLimit({ query: '', uiElements: ['CARD', 'BUTTON'] }, 10);

    expect(selectFrom).toHaveBeenCalled();
    expect(innerJoin).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    const condition = where.mock.calls[0][0];
    const sqlString = extractSqlString(condition);
    expect(sqlString).toContain('EXISTS');
    expect((sqlString.match(/EXISTS/g) ?? []).length).toBe(2);
  });
});
