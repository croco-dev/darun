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

import {
  CreateProduct,
  EditProduct,
  GetProduct,
  GetProductTags,
  Product as DomainProduct,
  ProductTag,
  Tag,
  UpdateProductTag,
} from '@darun/products-domain';
import { IndexProduct } from '@darun/search-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductCoreMutationResolver } from '../ProductCoreMutationResolver';

type MockedUseCase<T> = {
  execute: ReturnType<typeof vi.fn>;
};

const createMockUseCase = <T>(): MockedUseCase<T> => ({
  execute: vi.fn(),
});

describe('ProductCoreMutationResolver', () => {
  describe('editProduct', () => {
    it('search index payload includes tags and category when product is published', async () => {
      const publishedAt = new Date();
      const existingProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
      });

      const updatedProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Updated Product 1',
        summary: 'Updated Summary 1',
        logoUrl: 'https://example.com/logo.png',
        description: 'Updated description',
        categoryIds: ['category-1', 'category-2'],
        publishedAt,
      });

      const productTag = new ProductTag({
        productId: 'p1',
        tags: [new Tag({ name: 'tag-a' }), new Tag({ name: 'tag-b' })],
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(existingProduct);

      const editProductUseCase = createMockUseCase<EditProduct>();
      editProductUseCase.execute.mockResolvedValue(updatedProduct);

      const getProductTagsUseCase = createMockUseCase<GetProductTags>();
      getProductTagsUseCase.execute.mockResolvedValue(productTag);

      const indexProductUseCase = createMockUseCase<IndexProduct>();
      indexProductUseCase.execute.mockResolvedValue(true);

      const resolver = new ProductCoreMutationResolver(
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        editProductUseCase as unknown as EditProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        getProductTagsUseCase as unknown as GetProductTags
      );

      await resolver.editProduct('product-1', { name: 'Updated Product 1' });

      expect(indexProductUseCase.execute).toHaveBeenCalledTimes(1);
      expect(indexProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'p1',
          name: 'Updated Product 1',
          slug: 'product-1',
          summary: 'Updated Summary 1',
          description: 'Updated description',
          tags: ['tag-a', 'tag-b'],
          category: 'category-1',
          publishedAt,
        })
      );
    });

    it('search index payload uses empty tags and category fallback when product has none', async () => {
      const publishedAt = new Date();
      const existingProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
      });

      const updatedProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Updated Product 1',
        summary: 'Updated Summary 1',
        logoUrl: 'https://example.com/logo.png',
        publishedAt,
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(existingProduct);

      const editProductUseCase = createMockUseCase<EditProduct>();
      editProductUseCase.execute.mockResolvedValue(updatedProduct);

      const getProductTagsUseCase = createMockUseCase<GetProductTags>();
      getProductTagsUseCase.execute.mockResolvedValue(null);

      const indexProductUseCase = createMockUseCase<IndexProduct>();
      indexProductUseCase.execute.mockResolvedValue(true);

      const resolver = new ProductCoreMutationResolver(
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        editProductUseCase as unknown as EditProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        getProductTagsUseCase as unknown as GetProductTags
      );

      await resolver.editProduct('product-1', { name: 'Updated Product 1' });

      expect(indexProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
          category: '',
        })
      );
    });

    it('does not trigger search index when product is not published', async () => {
      const existingProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
      });

      const updatedProduct = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Updated Product 1',
        summary: 'Updated Summary 1',
        logoUrl: 'https://example.com/logo.png',
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(existingProduct);

      const editProductUseCase = createMockUseCase<EditProduct>();
      editProductUseCase.execute.mockResolvedValue(updatedProduct);

      const indexProductUseCase = createMockUseCase<IndexProduct>();

      const resolver = new ProductCoreMutationResolver(
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        editProductUseCase as unknown as EditProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        createMockUseCase<GetProductTags>() as unknown as GetProductTags
      );

      await resolver.editProduct('product-1', { name: 'Updated Product 1' });

      expect(indexProductUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
