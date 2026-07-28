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
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

import { Product as DomainProduct } from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductMediaMutationResolver } from '../ProductMediaMutationResolver';

const createMockUseCase = () => ({ execute: vi.fn() });

function createResolver() {
  const createProduct = createMockUseCase();
  const editProduct = createMockUseCase();
  const indexProduct = createMockUseCase();
  const updateProductTag = createMockUseCase();
  const getProduct = createMockUseCase();
  const getProductTags = createMockUseCase();
  const getCompany = createMockUseCase();
  const addProductScreenshot = createMockUseCase();
  const deleteProductScreenshot = createMockUseCase();
  const addProductLink = createMockUseCase();
  const updateProductLink = createMockUseCase();
  const registerProductCompany = createMockUseCase();
  const generateProductDescription = createMockUseCase();

  const resolver = new ProductMediaMutationResolver(
    createProduct as never,
    editProduct as never,
    indexProduct as never,
    updateProductTag as never,
    getProduct as never,
    getProductTags as never,
    getCompany as never,
    addProductScreenshot as never,
    deleteProductScreenshot as never,
    addProductLink as never,
    updateProductLink as never,
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
    registerProductCompany,
    generateProductDescription,
    getCompany,
  };
}

function createProduct(overrides: Partial<DomainProduct> = {}) {
  return { id: 'prod-1', slug: 'test', name: '테스트', ...overrides } as DomainProduct;
}

describe('ProductMediaMutationResolver', () => {
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
      });
      expect(result).toEqual({ product });
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

    it('설명을 생성하고 업데이트된 제품을 반환한다', async () => {
      const { resolver, getProduct, generateProductDescription } = createResolver();
      const product = createProduct();
      const updatedProduct = { ...product, description: 'AI 설명' } as DomainProduct;
      getProduct.execute.mockResolvedValue(product);
      generateProductDescription.execute.mockResolvedValue(updatedProduct);

      const result = await resolver.generateProductDescription({ slug: 'test' });

      expect(generateProductDescription.execute).toHaveBeenCalledWith({ productId: 'prod-1' });
      expect(result).toEqual({ product: updatedProduct });
    });
  });
});
