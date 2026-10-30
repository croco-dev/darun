import 'reflect-metadata';

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
  Connection: class Connection {},
  ConnectionArgs: class ConnectionArgs {},
  Cursor: class Cursor {},
  PageInfo: class PageInfo {},
}));

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Args: () => methodDecorator,
    ArgsType: () => () => {},
    Authorized: methodDecorator,
    Field: () => () => {},
    FieldResolver: methodDecorator,
    GraphQLISODateTime: class GraphQLISODateTime {},
    ID: class ID {},
    InputType: () => () => {},
    Int: class Int {},
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Query: methodDecorator,
    registerEnumType: () => {},
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { Product as DomainProduct } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { VisualUiElementGraph } from '../graphs/VisualUiElement';
import { ProductDescriptionQueryResolver } from '../ProductDescription.query.resolver';
import { ProductMediaMutationResolver } from '../ProductMediaMutationResolver';

const createMockUseCase = () => ({ execute: vi.fn() });

function createResolver() {
  const createProduct = createMockUseCase();
  const editProduct = createMockUseCase();
  const updateProductTag = createMockUseCase();
  const getProduct = createMockUseCase();
  const getProductTags = createMockUseCase();
  const getCompany = createMockUseCase();
  const addProductScreenshot = createMockUseCase();
  const deleteProductScreenshot = createMockUseCase();
  const addProductLink = createMockUseCase();
  const updateProductLink = createMockUseCase();
  const updateProductScreenshot = createMockUseCase();
  const registerProductCompany = createMockUseCase();
  const generateProductDescription = createMockUseCase();

  const resolver = new ProductMediaMutationResolver(
    createProduct as never,
    editProduct as never,
    updateProductTag as never,
    getProduct as never,
    getProductTags as never,
    getCompany as never,
    addProductScreenshot as never,
    deleteProductScreenshot as never,
    addProductLink as never,
    updateProductLink as never,
    updateProductScreenshot as never,
    registerProductCompany as never,
    generateProductDescription as never
  );

  return {
    resolver,
    getProduct,
    addProductScreenshot,
    deleteProductScreenshot,
    addProductLink,
    updateProductLink,
    updateProductScreenshot,
    registerProductCompany,
    generateProductDescription,
    getCompany,
  };
}

function createProduct(overrides: Partial<DomainProduct> = {}) {
  return { id: 'prod-1', slug: 'test', name: '테스트', ...overrides } as DomainProduct;
}

describe('ProductMediaMutationResolver', () => {
  describe('registerProductCompany', () => {
    it('존재하는 회사를 연결한 뒤 최신 상품을 응답한다', async () => {
      const { resolver, getProduct, getCompany, registerProductCompany } = createResolver();
      getProduct.execute
        .mockResolvedValueOnce(createProduct())
        .mockResolvedValueOnce(createProduct({ ownedCompanyId: 'company-722' }));
      getCompany.execute.mockResolvedValue({ id: 'company-722' });
      expect(await resolver.registerProductCompany('test', { companyId: 'company-722' })).toEqual({
        product: createProduct({ ownedCompanyId: 'company-722' }),
      });
      expect(registerProductCompany.execute).toHaveBeenCalledWith({ productId: 'prod-1', companyId: 'company-722' });
    });

    it('회사가 없으면 연결 쓰기를 실행하지 않는다', async () => {
      const { resolver, getProduct, getCompany, registerProductCompany } = createResolver();
      getProduct.execute.mockResolvedValue(createProduct());
      getCompany.execute.mockResolvedValue(null);
      await expect(resolver.registerProductCompany('test', { companyId: 'missing' })).rejects.toMatchObject({
        code: 'product/company-not-found',
      });
      expect(registerProductCompany.execute).not.toHaveBeenCalled();
    });
  });

  describe('updateProductLink', () => {
    it('slug로 확인한 상품 ID로 링크를 수정하고 최신 상품을 응답한다', async () => {
      const { resolver, getProduct, updateProductLink } = createResolver();
      const product = createProduct();
      const refreshed = createProduct({ name: '갱신된 상품' });
      getProduct.execute.mockResolvedValueOnce(product).mockResolvedValueOnce(refreshed);

      expect(
        await resolver.updateProductLink('test', 'link-b', {
          title: '새 제목',
        })
      ).toEqual({ product: refreshed });
      expect(updateProductLink.execute).toHaveBeenCalledWith({
        productId: 'prod-1',
        linkId: 'link-b',
        title: '새 제목',
      });
    });

    it('없는 상품은 기존 not-found로 거절하고 링크를 수정하지 않는다', async () => {
      const { resolver, getProduct, updateProductLink } = createResolver();
      getProduct.execute.mockResolvedValue(null);
      await expect(resolver.updateProductLink('missing', 'link-b', { title: '새 제목' })).rejects.toThrow(
        'product/not-found'
      );
      expect(updateProductLink.execute).not.toHaveBeenCalled();
    });
  });

  describe('addProductScreenshot', () => {
    it('제품이 없으면 에러를 던진다', async () => {
      const { resolver, getProduct } = createResolver();
      getProduct.execute.mockResolvedValue(null);

      await expect(
        resolver.addProductScreenshot('test', { imageUrl: 'https://example.com/img.png', imageAlt: '이미지' })
      ).rejects.toThrow();
    });

    it('스크린샷을 추가하고 최신 제품을 반환한다', async () => {
      const { resolver, getProduct, addProductScreenshot } = createResolver();
      const product = createProduct();
      getProduct.execute.mockResolvedValue(product);
      addProductScreenshot.execute.mockResolvedValue(undefined);

      const result = await resolver.addProductScreenshot('test', {
        imageUrl: 'https://example.com/img.png',
        imageAlt: '이미지',
      });

      expect(addProductScreenshot.execute).toHaveBeenCalledWith({
        productId: 'prod-1',
        imageUrl: 'https://example.com/img.png',
        imageAlt: '이미지',
        title: null,
        platform: null,
        screenType: null,
      });
      expect(result).toEqual({ product });
    });
  });

  describe('updateProductScreenshot', () => {
    it('uiElements를 전달하면 usecase에 그대로 전달한다', async () => {
      const { resolver, updateProductScreenshot } = createResolver();
      updateProductScreenshot.execute.mockResolvedValue({ id: 'screenshot-1' });

      await resolver.updateProductScreenshot({
        id: 'screenshot-1',
        imageAlt: '이미지',
        uiElements: [VisualUiElementGraph.CARD, VisualUiElementGraph.BUTTON],
      });

      expect(updateProductScreenshot.execute).toHaveBeenCalledWith({
        id: 'screenshot-1',
        imageAlt: '이미지',
        title: undefined,
        platform: undefined,
        screenType: undefined,
        uiElements: [VisualUiElementGraph.CARD, VisualUiElementGraph.BUTTON],
      });
    });

    it('uiElements를 생략하면 usecase 호출에 키를 포함하지 않는다', async () => {
      const { resolver, updateProductScreenshot } = createResolver();
      updateProductScreenshot.execute.mockResolvedValue({ id: 'screenshot-1' });

      await resolver.updateProductScreenshot({ id: 'screenshot-1', imageAlt: '이미지' });

      expect(updateProductScreenshot.execute).toHaveBeenCalledWith({
        id: 'screenshot-1',
        imageAlt: '이미지',
        title: undefined,
        platform: undefined,
        screenType: undefined,
      });
      expect(updateProductScreenshot.execute.mock.calls[0][0]).not.toHaveProperty('uiElements');
    });
  });

  describe('deleteProductScreenshot', () => {
    it('스크린샷을 삭제하고 성공 응답을 반환한다', async () => {
      const { resolver, deleteProductScreenshot } = createResolver();
      deleteProductScreenshot.execute.mockResolvedValue(undefined);

      const result = await resolver.deleteProductScreenshot('screenshot-1');

      expect(deleteProductScreenshot.execute).toHaveBeenCalledWith('screenshot-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('generateProductDescription', () => {
    it('제품이 없으면 에러를 던진다', async () => {
      const { resolver, getProduct } = createResolver();
      getProduct.execute.mockResolvedValue(null);

      await expect(resolver.generateProductDescription({ slug: 'test' })).rejects.toThrow();
    });

    it('설명 초안 후보를 생성하고 job 정보를 반환한다', async () => {
      const { resolver, getProduct, generateProductDescription } = createResolver();
      const product = createProduct();
      const candidateResult = {
        candidateHtml: '<p>AI 설명</p>',
        evidenceHash: 'hash-1',
        baseDescriptionHash: 'base-hash-1',
        document: {
          intro: { text: 'intro', evidenceRefs: [] },
          sections: [],
          recommendedIf: [],
          closing: { text: 'closing', evidenceRefs: [] },
        },
        writerModel: 'writer',
        reviewerModel: 'reviewer',
        writerPromptVersion: 'v1',
        reviewerPromptVersion: 'v1',
        rendererVersion: 'v1',
      };
      getProduct.execute.mockResolvedValue(product);
      generateProductDescription.execute.mockResolvedValue(candidateResult);

      const result = await resolver.generateProductDescription({ slug: 'test' });

      expect(generateProductDescription.execute).toHaveBeenCalledWith({ productId: 'prod-1' });
      expect(result).toEqual({
        product,
        job: {
          id: `candidate-${product.id}`,
          productId: product.id,
          status: 'completed',
          message: 'AI 소개 초안 생성이 완료되었습니다.',
          candidateHtml: '<p>AI 설명</p>',
          evidenceHash: 'hash-1',
          baseDescriptionHash: 'base-hash-1',
        },
      });
    });

    it('productDescriptionJobService가 제공되면 비동기 작업을 요청하고 job과 product를 반환한다', async () => {
      const mockJobService = {
        requestProductDescriptionJob: vi.fn().mockResolvedValue({
          product: createProduct(),
          job: {
            id: 'job-1',
            productId: 'prod-1',
            status: 'pending',
            message: '대기 중',
          },
        }),
      };
      const { getProduct, generateProductDescription } = createResolver();
      const resolver = new ProductMediaMutationResolver(
        {} as never,
        {} as never,
        {} as never,
        getProduct as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        generateProductDescription as never,
        mockJobService as never
      );

      const result = await resolver.generateProductDescription({ slug: 'test' });
      const load = vi.fn().mockRejectedValue(new Error('Unexpected candidate read'));
      const fields = new ProductDescriptionQueryResolver({ getCandidateHtml: load } as never, {} as never, {} as never);
      expect(await fields.candidateHtml(result.job!)).toBeNull();
      expect(load).not.toHaveBeenCalled();
      expect(mockJobService.requestProductDescriptionJob).toHaveBeenCalledWith({ slug: 'test' });
      expect(result.job).toEqual({
        id: 'job-1',
        productId: 'prod-1',
        status: 'pending',
        message: '대기 중',
      });
    });
  });
});
