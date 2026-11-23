import 'reflect-metadata';
import {
  CreateProductFeature,
  GetProduct,
  GetProductFeature,
  ProductFeature,
  UpdateProductFeature,
  type ProductFeatureRepository,
  type ProductRepository,
} from '@darun/products-domain';
import { FeatureMutationResolver } from '@darun/products-feature/server';
import { AuthRole, createAuthChecker, createServer } from '@darun/utils-apollo-server';
import * as Sentry from '@sentry/node';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthResolver } from '../src/app/graphql/Health.resolver';
import { createGraphQLDiagnostics } from '../src/app/graphqlDiagnostics';

const feature = {
  id: 'feature-id',
  productId: 'product-id',
  name: '검색',
  emoji: '🔎',
  summary: '기존 요약',
} as const;

const repository = {
  findOneById: vi.fn(async () => new ProductFeature(feature)),
  findManyByProductId: vi.fn(),
  insert: vi.fn<ProductFeatureRepository['insert']>(async input => new ProductFeature({ ...input, id: 'new-id' })),
  updateById: vi.fn<ProductFeatureRepository['updateById']>(async (_, modify) => modify(new ProductFeature(feature))),
} satisfies ProductFeatureRepository;
const resolver = new FeatureMutationResolver(
  new CreateProductFeature(repository),
  new GetProduct({ findOneBySlug: async () => ({ id: 'product-id' }) } as ProductRepository),
  new GetProductFeature(repository),
  new UpdateProductFeature(repository)
);
const server = createServer({
  options: {
    resolvers: [HealthResolver, FeatureMutationResolver],
    authChecker: createAuthChecker(),
    container: { get: target => (target === FeatureMutationResolver ? resolver : new HealthResolver()) },
  },
  config: { playground: false, plugins: [createGraphQLDiagnostics()] },
});
afterAll(() => server.stop());
beforeEach(() => vi.clearAllMocks());

const create = `mutation ($input: CreateProductFeatureInput!) {
  createProductFeature(input: $input) { feature { name summary } }
}`;
const update = `mutation ($input: UpdateProductFeatureInput!) {
  updateProductFeature(id: "feature-id", input: $input) { feature { name summary } }
}`;

async function execute(query: string, input: Record<string, string | null>, roles: string[] = [AuthRole.Admin]) {
  const { body } = await server.executeOperation(
    { query, variables: { input } },
    { contextValue: { getRoles: async () => roles } }
  );
  if (body.kind !== 'single') throw new Error('Expected a single GraphQL result');
  return body.singleResult;
}

describe('기능 저장 GraphQL 응답', () => {
  it('관리자 권한이 없으면 입력 길이 검증과 저장에 도달하지 않는다', async () => {
    const result = await execute(update, { summary: '요'.repeat(256) }, []);
    expect(result.errors).toMatchObject([{ extensions: { code: 'UNAUTHORIZED' } }]);
    expect(repository.findOneById).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('한 글자 초과한 값을 필드 오류로 반환하고 진단 이벤트로 보내지 않는다', async () => {
    const sent = vi.fn(async () => ({}));
    Sentry.init({
      dsn: 'https://fixture@telemetry.invalid/1',
      defaultIntegrations: false,
      sendClientReports: false,
      skipOpenTelemetrySetup: true,
      transport: () => ({ send: sent, flush: async () => true }),
    });
    try {
      const creation = await execute(create, {
        productSlug: 'fixture',
        name: '🔎'.repeat(100) + ' ',
        summary: '한글 요약',
        emoji: '🔎',
      });
      expect(creation.errors).toMatchObject([
        {
          message: 'Feature name must be at most 100 characters.',
          extensions: { code: 'product-feature/name-too-long' },
        },
      ]);
      const edit = await execute(update, { summary: '요'.repeat(255) + '🚀' });
      expect(edit.errors).toMatchObject([
        {
          message: 'Feature summary must be at most 255 characters.',
          extensions: { code: 'product-feature/summary-too-long' },
        },
      ]);
      expect(repository.insert).not.toHaveBeenCalled();
      expect(repository.updateById).not.toHaveBeenCalled();
      await Sentry.flush(2000);
      expect(sent).not.toHaveBeenCalled();

      repository.updateById.mockRejectedValueOnce(new Error('Unexpected repository failure'));
      const failure = await execute(update, { summary: '한도 이내' });
      expect(failure.errors).toMatchObject([{ extensions: { code: 'INTERNAL_SERVER_ERROR' } }]);
      await Sentry.flush(2000);
      expect(sent).toHaveBeenCalledOnce();
    } finally {
      await Sentry.close(2000);
    }
  });

  it('최대 길이로 등록하고 기존 요약을 null로 비울 수 있다', async () => {
    const name = '검'.repeat(99) + '🔎';
    const summary = '🚀'.repeat(255);
    const creation = await execute(create, { productSlug: 'fixture', name, summary, emoji: '🔎' });
    expect(creation.errors).toBeUndefined();
    expect(creation.data).toEqual({ createProductFeature: { feature: { name, summary } } });
    const edit = await execute(update, { name, summary: null });
    expect(edit.errors).toBeUndefined();
    expect(edit.data).toEqual({ updateProductFeature: { feature: { name, summary: null } } });
  });
});
