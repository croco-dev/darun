import 'reflect-metadata';
import { Product, ProductFlow, ProductScreenshot, type VisualFlowDetail } from '@darun/products-domain';
import { VisualFlowOnDetailDocument } from '@darun/provider-graphql';
import { buildSchemaSync } from 'type-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { toGraphFlowDetail, toGraphFlowFromSaved } from '../VisualFlow.mapper';
import { toGraphVisualFlow, VisualFlowQueryResolver } from '../VisualFlow.query.resolver';
import { VisualSaveMutationResolver } from '../VisualSave.mutation.resolver';

const { graphql, print } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const product = new Product({
  id: 'product-1',
  name: '메모',
  slug: 'memo',
  logoUrl: 'https://example.com/memo-logo.png',
  summary: '팀의 기록을 모으는 서비스',
});
const screenshot = {
  id: 'shot-1',
  imageUrl: 'https://example.com/screen.png',
  imageAlt: '기록 화면',
  title: '기록',
};
const detail = {
  id: '01J00000000000000000000001',
  title: '기록 찾기',
  description: '저장한 기록을 검색합니다.',
  platform: 'WEB',
  flowType: 'SEARCH',
  productId: product.id,
  productName: product.name,
  productSlug: product.slug,
  productLogoUrl: product.logoUrl,
  productSummary: product.summary,
  steps: [{ position: 0, caption: '검색', screenshot }],
};
const summary = { ...detail, stepCount: 1, coverScreenshot: screenshot };
const expectedProduct = {
  id: product.id,
  name: product.name,
  slug: product.slug,
  logoUrl: 'https://example.com/memo-logo.png',
  summary: '팀의 기록을 모으는 서비스',
};

function createResolver(flow: VisualFlowDetail = detail): VisualFlowQueryResolver {
  return Object.assign(Object.create(VisualFlowQueryResolver.prototype) as VisualFlowQueryResolver, {
    getVisualFlowByIdUseCase: { execute: vi.fn().mockResolvedValue(flow) },
    getAdminProductFlowUseCase: { execute: vi.fn().mockResolvedValue(flow) },
    getVisualFlowsUseCase: {
      execute: vi.fn().mockResolvedValue({
        flows: [summary],
        totalCount: 1,
        hasNextPage: false,
      }),
    },
  });
}

describe('플로의 상품 정보', () => {
  beforeEach(() => vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'flow-product-test-only'));
  afterEach(() => vi.unstubAllEnvs());
  it('실제 공개 상세 operation과 관리자 상세·탐색이 저장된 상품 정보를 반환한다', async () => {
    const resolver = createResolver();
    const schema = buildSchemaSync({
      resolvers: [VisualFlowQueryResolver],
      authChecker: () => true,
      container: { get: () => resolver },
    });
    const operation = print(VisualFlowOnDetailDocument);
    const result = await graphql({
      schema,
      source: operation,
      variableValues: { id: detail.id },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.visualFlow).toMatchObject({ product: expectedProduct });
    const admin = await graphql({
      schema,
      source: 'query($id: String!) { adminProductFlow(id: $id) { product { id name slug logoUrl summary } } }',
      variableValues: { id: detail.id },
    });
    expect(admin.errors).toBeUndefined();
    expect(admin.data?.adminProductFlow).toMatchObject({
      product: expectedProduct,
    });
    expect((await resolver.visualFlows()).edges[0].node.product).toEqual(expectedProduct);
  });

  it('저장 목록 GraphQL 응답도 같은 상품 정보를 반환한다', async () => {
    const resolver: VisualSaveMutationResolver = Object.assign(Object.create(VisualSaveMutationResolver.prototype), {
      getMyVisualSavedFlowsUseCase: {
        execute: vi.fn().mockResolvedValue({ flows: [summary], totalCount: 1, hasNextPage: false }),
      },
    });
    const schema = buildSchemaSync({
      resolvers: [VisualSaveMutationResolver],
      authChecker: () => true,
      container: { get: () => resolver },
    });
    const result = await graphql({
      schema,
      source: '{ myVisualSavedFlows { edges { node { product { id name slug logoUrl summary } } } } }',
      contextValue: { getUserIdOrThrow: async () => 'user-1' },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.myVisualSavedFlows).toMatchObject({ edges: [{ node: { product: expectedProduct } }] });
  });

  it('공유 상세·저장 목록용 매핑과 mutation 응답도 같은 상품 정보를 보존한다', () => {
    expect(toGraphVisualFlow(summary).product).toEqual(expectedProduct);
    expect(toGraphFlowDetail(detail, detail.id).product).toEqual(expectedProduct);
    const flow = new ProductFlow({
      ...detail,
      steps: [{ screenshotId: screenshot.id, caption: '검색' }],
    });
    expect(
      toGraphFlowFromSaved(flow, product, [new ProductScreenshot({ ...screenshot, productId: product.id })]).product
    ).toEqual(expectedProduct);
  });

  it('로고와 요약이 없는 상품도 그대로 반환한다', async () => {
    const empty = { ...detail, productLogoUrl: '', productSummary: '' };
    expect((await createResolver(empty).visualFlow(detail.id))?.product).toMatchObject({ logoUrl: '', summary: '' });
    expect(toGraphVisualFlow({ ...summary, productLogoUrl: '', productSummary: '' }).product).toMatchObject({
      logoUrl: '',
      summary: '',
    });
  });
});
