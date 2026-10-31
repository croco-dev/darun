import 'reflect-metadata';
import { GetAllCompanies, SearchCompany, type CompanyRepository } from '@darun/companies-domain';
import { CompanyQueryResolver } from '@darun/companies-feature/server';
import { createServer } from '@darun/utils-apollo-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('회사 검색의 운영 GraphQL 응답 계약', () => {
  const repository: CompanyRepository = {
    findById: vi.fn(),
    findAllWithPagination: vi.fn(),
    findByName: vi.fn().mockResolvedValue([]),
    insert: vi.fn(),
  };
  const resolver = new CompanyQueryResolver(new GetAllCompanies(repository), new SearchCompany(repository));
  const server = createServer({
    options: {
      resolvers: [CompanyQueryResolver],
      container: { get: () => resolver },
      authChecker: ({ context }) => context.admin === true,
    },
    config: { playground: false },
  });

  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => vi.mocked(repository.findByName).mockClear());

  async function search(variables: Record<string, unknown>, admin = true) {
    const result = await server.executeOperation(
      {
        query: 'query($query: String!, $first: Int) { searchCompanies(query: $query, first: $first) { id name } }',
        variables,
      },
      { contextValue: { admin } }
    );
    if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
    return result.body.singleResult;
  }

  it('기존 요청·null은 기본 20개, 명시한 first는 해당 상한으로 전달한다', async () => {
    for (const [first, expected] of [
      [undefined, 20],
      [null, 20],
      [1, 1],
      [50, 50],
    ] as const) {
      const result = await search({ query: ' 다런 ', ...(first === undefined ? {} : { first }) });
      expect(result.errors).toBeUndefined();
      expect(result.data?.searchCompanies).toEqual([]);
      expect(repository.findByName).toHaveBeenLastCalledWith('다런', expected);
    }
  });

  it.each([{ query: '다런', first: 0 }, { query: '다런', first: 51 }, { query: '가'.repeat(101) }])(
    '입력 오류 %j는 운영 응답에도 도메인 코드로 전달하고 저장소를 호출하지 않는다',
    async variables => {
      const result = await search(variables);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].extensions).toEqual({ code: 'company/invalid-search-args' });
      expect(result.errors![0].message).toBe('company/invalid-search-args');
      expect(repository.findByName).not.toHaveBeenCalled();
    }
  );

  it('빈 입력은 빈 목록이고 Int 타입 오류는 저장소 전에 거절한다', async () => {
    expect((await search({ query: ' \t ' })).data?.searchCompanies).toEqual([]);
    const invalid = await search({ query: '다런', first: 1.5 });
    expect(invalid.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('관리자 권한이 없는 요청은 저장소 전에 거절한다', async () => {
    const result = await search({ query: '다런', first: 20 }, false);
    expect(result.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('조회 장애는 입력 오류나 빈 결과로 바꾸지 않고 내부 원문을 숨긴다', async () => {
    vi.mocked(repository.findByName).mockRejectedValueOnce(new Error('private read failure detail'));
    const result = await search({ query: '다런' });
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toMatchObject({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(JSON.stringify(result)).not.toContain('private read failure detail');
  });
});
