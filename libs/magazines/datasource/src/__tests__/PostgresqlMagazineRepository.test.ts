import 'reflect-metadata';
import { Magazine } from '@darun/magazines-domain';
import { Drizzle } from '@darun/provider-database';
import { describe, expect, it, vi } from 'vitest';
import { PostgresqlMagazineRepository } from '../repositories/PostgresqlMagazineRepository';

function makeSchema(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mag-1',
    title: '테스트 매거진',
    slug: 'test-magazine',
    summary: '요약',
    content: null,
    backgroundImageUrl: 'https://example.com/bg.png',
    logoImageUrl: null,
    authorId: 'author-1',
    publishedAt: null,
    updatedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PostgresqlMagazineRepository', () => {
  describe('insert', () => {
    it('매거진을 삽입하고 반환한다', async () => {
      const returning = vi.fn().mockResolvedValue([makeSchema()]);
      const values = vi.fn().mockReturnValue({ returning });
      const mockTx = { insert: vi.fn().mockReturnValue({ values }) };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.insert(
        new Magazine({
          title: '테스트 매거진',
          backgroundImageUrl: 'https://example.com/bg.png',
          authorId: 'author-1',
        })
      );

      expect(result).toBeInstanceOf(Magazine);
      expect(result!.id).toBe('mag-1');
      expect(result!.title).toBe('테스트 매거진');
    });
  });

  describe('findOneById', () => {
    it('id로 매거진을 조회한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([makeSchema()]),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.findOneById('mag-1');

      expect(result).toBeInstanceOf(Magazine);
      expect(result!.id).toBe('mag-1');
    });

    it('존재하지 않으면 null을 반환한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as unknown as Drizzle;

      const repository = new PostgresqlMagazineRepository(mockDb);
      const result = await repository.findOneById('nonexistent');

      expect(result).toBeNull();
    });
  });
});

describe('매거진 편집 revision', () => {
  function fixture() {
    const row = makeSchema({ revision: 4 });
    const returning = vi.fn(async () => [row]);
    const set = vi.fn((values: object) => {
      Object.assign(row, values);
      return { where: () => ({ returning }) };
    });
    const query = {
      limit: async () => [row],
      then: (resolve: (rows: object[]) => unknown) => Promise.resolve([row]).then(resolve),
    };
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: () => query }) }) }),
      update: () => ({ set }),
    };
    const db = {
      transaction: async (fn: (tx: unknown) => unknown) => fn(tx),
    } as unknown as Drizzle;
    return { repository: new PostgresqlMagazineRepository(db), row, set };
  }

  it.each([undefined, null, -1, 1.5, 2_147_483_648, NaN])(
    '잘못된 기준 버전 %j로는 저장·발행하지 않는다',
    async revision => {
      const { repository, set } = fixture();
      const expected = revision as number;
      const modifier = vi.fn((magazine: Magazine) => magazine);
      await expect(repository.updateById('mag-1', modifier, expected)).rejects.toMatchObject({
        code: 'magazine/invalid-args',
      });
      await expect(repository.publishById('mag-1', expected)).rejects.toMatchObject({ code: 'magazine/invalid-args' });
      expect(modifier).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    }
  );

  it('오래된 편집은 modifier와 쓰기를 실행하지 않는다', async () => {
    const { repository, row, set } = fixture();
    const modifier = vi.fn((magazine: Magazine) => {
      magazine.title = '오래된 제목';
      return magazine;
    });
    await expect(repository.updateById('mag-1', modifier, 3)).rejects.toMatchObject({
      code: 'magazine/revision-conflict',
    });
    expect(modifier).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(row.title).toBe('테스트 매거진');
  });

  it('검토 이후 바뀐 글의 발행은 쓰지 않는다', async () => {
    const { repository, set } = fixture();
    await expect(repository.publishById('mag-1', 3)).rejects.toMatchObject({
      code: 'magazine/revision-conflict',
    });
    expect(set).not.toHaveBeenCalled();
  });
});
