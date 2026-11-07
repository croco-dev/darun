import 'reflect-metadata';
import { PostgresqlCompanyRepository } from '@darun/companies-datasource';
import {
  Company,
  CreateCompany,
  GetAllCompanies,
  SearchCompany,
  type CompanyRepository,
} from '@darun/companies-domain';
import { CompanyMutationResolver, CompanyQueryResolver } from '@darun/companies-feature/server';
import { createServer } from '@darun/utils-apollo-server';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const url = process.env.COMPANY_CREATE_TEST_DATABASE_URL;
let activeRepository: CompanyRepository;
const repository: CompanyRepository = {
  insert: company => activeRepository.insert(company),
  findById: id => activeRepository.findById(id),
  findByName: (name, first) => activeRepository.findByName(name, first),
  findAllWithPagination: (page, limit) => activeRepository.findAllWithPagination(page, limit),
};
const mutation = new CompanyMutationResolver(new CreateCompany(repository));
const query = new CompanyQueryResolver(new GetAllCompanies(repository), new SearchCompany(repository));
const server = createServer({
  options: {
    resolvers: [CompanyMutationResolver, CompanyQueryResolver],
    container: { get: target => (target === CompanyMutationResolver ? mutation : query) },
    authChecker: ({ context }) => context.admin === true,
  },
  config: { playground: false },
});
beforeAll(() => server.start());
afterAll(() => server.stop());

for (const mode of ['memory', 'postgres'] as const) {
  describe.skipIf(mode === 'postgres' && !url)(`회사 생성의 운영 Apollo 응답 (${mode})`, () => {
    let client: Sql | undefined;
    let writes: unknown[];

    beforeAll(async () => {
      if (mode === 'postgres') {
        const target = new URL(url!);
        if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/darun_company_create') {
          throw new Error('Requires isolated local darun_company_create database');
        }
        client = postgres(url!, { max: 1, connect_timeout: 5, connection: { statement_timeout: 10000 } });
        await migrate(drizzle(client), { migrationsFolder: resolve(__dirname, '../scripts/migrations') });
        activeRepository = new PostgresqlCompanyRepository(
          drizzle(client, { logger: { logQuery: query => writes.push(query) } })
        );
      } else {
        activeRepository = {
          insert: vi.fn(async company => {
            writes.push(company);
            return new Company({ ...company, id: 'created-company' });
          }),
          findById: vi.fn(),
          findByName: vi.fn(),
          findAllWithPagination: vi.fn(),
        };
      }
    }, 30000);

    beforeEach(async () => {
      if (client) await client`truncate companies cascade`;
      writes = [];
    });
    afterAll(async () => {
      if (client) await client.end({ timeout: 5 });
    });

    async function create(input: Record<string, unknown>, admin = true) {
      const result = await server.executeOperation(
        {
          query:
            'mutation($input: CreateCompanyInput!) { createCompany(input: $input) { company { id name type address startAt } } }',
          variables: { input },
        },
        { contextValue: { admin } }
      );
      if (result.body.kind !== 'single') throw new Error('Expected a single GraphQL response');
      return result.body.singleResult;
    }

    for (const [field, limit] of [
      ['name', 100],
      ['type', 20],
      ['address', 200],
    ] as const) {
      it.each(['한', '🚀'])(`${field} 상한+1의 %s 입력은 쓰기 없이 수정 가능한 오류로 응답한다`, async character => {
        const result = await create({
          name: '다런',
          type: '법인',
          address: '서울',
          [field]: character.repeat(limit + 1),
        });
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0]).toMatchObject({ extensions: { code: 'company/invalid-args' } });
        expect(result.errors![0].message).toContain(`${limit}자 이하`);
        expect(writes).toEqual([]);
        if (client) expect((await client`select count(*) from companies`)[0].count).toBe('0');
      });
    }

    it.each(['한', '🚀'])('각 필드의 %s 상한값을 그대로 저장하고 개업일 미상을 유지한다', async character => {
      const input = { name: character.repeat(100), type: character.repeat(20), address: character.repeat(200) };
      const result = await create(input);
      expect(result.errors).toBeUndefined();
      expect(result.data?.createCompany).toEqual({ company: { id: expect.any(String), ...input, startAt: null } });
      expect(writes.length).toBeGreaterThan(0);
      if (client) {
        const [row] = await client`select name, type, address, char_length(name) as length from companies`;
        expect(row).toEqual({ ...input, length: 100 });
      }
    });

    it('기존 개업일 입력은 그대로 반환한다', async () => {
      const result = await create({ name: '다런', type: '법인', address: '서울', startAt: '2026-10-01T00:00:00.000Z' });
      expect(result.errors).toBeUndefined();
      expect(result.data?.createCompany).toMatchObject({ company: { startAt: '2026-10-01T00:00:00.000Z' } });
    });

    it('관리자 권한이 없는 요청은 저장소 전에 거절한다', async () => {
      const result = await create({ name: '다런', type: '법인', address: '서울' }, false);
      expect(result.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
      expect(writes).toEqual([]);
    });
  });
}
