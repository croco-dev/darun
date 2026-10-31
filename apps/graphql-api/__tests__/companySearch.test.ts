import 'reflect-metadata';
import { GetAllCompanies, SearchCompany, type CompanyRepository } from '@darun/companies-domain';
import { CompanyQueryResolver } from '@darun/companies-feature/server';
import type * as GraphQL from 'graphql';
import { buildSchemaSync } from 'type-graphql';
import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const { graphql } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof GraphQL;

function fixture() {
  const repository: CompanyRepository = {
    findById: vi.fn(),
    findAllWithPagination: vi.fn(),
    findByName: vi.fn().mockResolvedValue([]),
    insert: vi.fn(),
  };
  const resolver = new CompanyQueryResolver(new GetAllCompanies(repository), new SearchCompany(repository));
  const schema = buildSchemaSync({
    resolvers: [CompanyQueryResolver],
    container: { get: () => resolver },
    authChecker: ({ context }) => context.admin === true,
  });
  const search = (variableValues: Record<string, unknown>, admin = true) =>
    graphql({
      schema,
      source: 'query($query: String!, $first: Int) { searchCompanies(query: $query, first: $first) { id name } }',
      variableValues,
      contextValue: { admin },
    });
  return { repository, search };
}

describe('회사 검색 GraphQL 인자 계약', () => {
  it('기존 요청·null은 기본 20개, 명시한 first는 해당 상한으로 전달한다', async () => {
    const { repository, search } = fixture();
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

  it('빈 입력은 빈 목록이고 범위·길이·Int 타입 오류는 저장소 전에 거절한다', async () => {
    const { repository, search } = fixture();
    expect((await search({ query: ' \t ' })).data?.searchCompanies).toEqual([]);
    for (const variables of [{ query: '다런', first: 0 }, { query: '다런', first: 51 }, { query: '가'.repeat(101) }]) {
      expect((await search(variables)).errors?.[0].message).toContain('company/invalid-search-args');
    }
    expect((await search({ query: '다런', first: 1.5 })).errors?.[0].message).toContain('Int');
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('관리자 권한이 없는 요청은 저장소 전에 거절한다', async () => {
    const { repository, search } = fixture();
    expect((await search({ query: '다런', first: 20 }, false)).errors?.[0].message).toContain('Access denied');
    expect(repository.findByName).not.toHaveBeenCalled();
  });
});
