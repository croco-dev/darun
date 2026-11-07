import 'reflect-metadata';
import { ImageRepositoryToken, SignImageUpload, ScreenshotUploadProductReaderToken } from '@darun/images-domain';
import { ImageMutationResolver } from '@darun/images-feature/server';
import { CreateProduct, ProductRepositoryToken } from '@darun/products-domain';
import { createServer } from '@darun/utils-apollo-server';
import { Container } from 'typedi';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRepository } from '../../../libs/products/domain/src/__tests__/productRepositoryMock';
import { ProductCoreMutationResolver } from '../../../libs/products/feature/src/ProductCoreMutationResolver';
import { HealthResolver } from '../src/app/graphql/Health.resolver';
import { registerRepositoryAliases } from '../src/config/repositoryAliases';

const repository = createMockRepository();
const sign = vi.fn(({ uploadFolder }: { uploadFolder: string; displayName: string }) => ({
  signature: 'fixture-signature',
  folder: uploadFolder,
  timestamp: 1700000000,
}));
Container.set(ProductRepositoryToken, repository);
Container.set(ImageRepositoryToken, { signImageUpload: sign });
registerRepositoryAliases();
const imageResolver = new ImageMutationResolver(Container.get(SignImageUpload));
const productResolver = new ProductCoreMutationResolver(
  new CreateProduct(repository),
  {} as never,
  {} as never,
  {} as never,
  {} as never
);
const server = createServer({
  options: {
    resolvers: [ImageMutationResolver, ProductCoreMutationResolver, HealthResolver],
    container: {
      get: target =>
        target === ImageMutationResolver
          ? imageResolver
          : target === ProductCoreMutationResolver
            ? productResolver
            : new HealthResolver(),
    },
    authChecker: ({ context }) => context.admin === true,
  },
  config: { playground: false },
});
beforeAll(() => server.start());
afterAll(async () => {
  await server.stop();
  for (const token of [ProductRepositoryToken, ImageRepositoryToken, ScreenshotUploadProductReaderToken])
    Container.remove(token);
  Container.remove(SignImageUpload);
});
beforeEach(() => vi.clearAllMocks());

async function request(query: string, input: Record<string, unknown>, admin = true) {
  const response = await server.executeOperation({ query, variables: { input } }, { contextValue: { admin } });
  if (response.body.kind !== 'single') throw new Error('Expected single response');
  return response.body.singleResult;
}
const signQuery =
  'mutation($input: SignImageUploadInput!) { signImageUpload(input: $input) { folder signature timestamp } }';

describe('상품 slug와 업로드의 운영 GraphQL 경로', () => {
  it.each(['My_Product', 'a--b', 'a'.repeat(101)])(
    '신규 slug %s는 입력 오류로 응답하고 DB 쓰기를 하지 않는다',
    async slug => {
      const result = await request(
        'mutation($input: CreateProductInput!) { createProduct(input: $input) { product { id } } }',
        {
          name: '앱',
          slug,
          summary: '요약',
          logoUrl: 'https://fixture.invalid/logo.png',
        }
      );
      expect(result.errors?.[0].extensions).toEqual({ code: 'product/invalid-args' });
      expect(repository.insert).not.toHaveBeenCalled();
      expect(repository.findOneBySlug).not.toHaveBeenCalled();
    }
  );

  it('기존 slug를 실제 reader alias로 확인하고 ID 폴더를 반환한다', async () => {
    vi.mocked(repository.findOneBySlug).mockResolvedValue({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' } as never);
    const result = await request(signQuery, { folder: 'images/screenshots/My_Product', displayName: 'shot.png' });
    expect(result.errors).toBeUndefined();
    expect(result.data?.signImageUpload).toEqual({
      folder: 'images/screenshots-by-product/01ARZ3NDEKTSV4RRFFQ69G5FAV',
      signature: 'fixture-signature',
      timestamp: 1700000000,
    });
    expect(repository.findOneBySlug).toHaveBeenCalledWith('My_Product');
    expect(sign).toHaveBeenCalledOnce();
  });

  it('기존 허용 slug의 경로는 그대로 서명한다', async () => {
    const result = await request(signQuery, { folder: 'images/screenshots/example-app', displayName: 'shot.png' });
    expect(result.errors).toBeUndefined();
    expect(result.data?.signImageUpload).toMatchObject({ folder: 'images/screenshots/example-app' });
    expect(repository.findOneBySlug).not.toHaveBeenCalled();
  });

  it.each([false, undefined])('관리자 아닌 요청 %s는 상품 조회·서명 전에 거절한다', async admin => {
    const result = await request(
      signQuery,
      { folder: 'images/screenshots/My_Product', displayName: 'shot.png' },
      admin === true
    );
    expect(result.errors?.[0].extensions?.code).toBe('UNAUTHORIZED');
    expect(repository.findOneBySlug).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });
});
