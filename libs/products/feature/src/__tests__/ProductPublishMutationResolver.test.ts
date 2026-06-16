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

import { GetCompany, type CompanyRepository } from '@darun/companies-domain';
import {
  AddProductLink,
  AddProductScreenshot,
  CreateProduct,
  DeleteProductScreenshot,
  EditProduct,
  GenerateProductDescription,
  GetProduct,
  GetProductTags,
  Product as DomainProduct,
  ProductTag,
  PublishProduct,
  RegisterProductCompany,
  Tag,
  UpdateProductLink,
  UpdateProductTag,
} from '@darun/products-domain';
import { IndexProduct } from '@darun/search-domain';
import { TranslationJobService } from '@darun/translation-service';
import { describe, expect, it, vi } from 'vitest';
import { ProductPublishMutationResolver } from '../ProductPublishMutationResolver';

type MockedUseCase<T> = {
  execute: ReturnType<typeof vi.fn>;
};

const createMockUseCase = <T>(): MockedUseCase<T> => ({
  execute: vi.fn(),
});

const createCompanyRepository = (): CompanyRepository => ({
  findById: vi.fn<CompanyRepository['findById']>().mockResolvedValue(null),
  findAllWithPagination: vi.fn<CompanyRepository['findAllWithPagination']>().mockResolvedValue({ data: [], total: 0 }),
  findByName: vi.fn<CompanyRepository['findByName']>().mockResolvedValue([]),
  insert: vi.fn<CompanyRepository['insert']>().mockResolvedValue(null),
});

const createMockTranslationJobService = () =>
  ({
    translateEntity: vi.fn().mockResolvedValue(undefined),
  }) as unknown as TranslationJobService;

describe('ProductPublishMutationResolver', () => {
  describe('publishProduct', () => {
    it('search index payload includes tags and category', async () => {
      const publishedAt = new Date();
      const product = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
        description: 'Description 1',
        categoryIds: ['category-1', 'category-2'],
      });

      const publishedProduct = new DomainProduct({
        ...product,
        publishedAt,
      });

      const productTag = new ProductTag({
        productId: 'p1',
        tags: [new Tag({ name: 'tag-a' }), new Tag({ name: 'tag-b' })],
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(product);

      const publishProductUseCase = createMockUseCase<PublishProduct>();
      publishProductUseCase.execute.mockResolvedValue(publishedProduct);

      const getProductTagsUseCase = createMockUseCase<GetProductTags>();
      getProductTagsUseCase.execute.mockResolvedValue(productTag);

      const indexProductUseCase = createMockUseCase<IndexProduct>();
      indexProductUseCase.execute.mockResolvedValue(true);

      const resolver = new ProductPublishMutationResolver(
        new GetCompany(createCompanyRepository()),
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        createMockUseCase<EditProduct>() as unknown as EditProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        getProductTagsUseCase as unknown as GetProductTags,
        createMockUseCase<AddProductScreenshot>() as unknown as AddProductScreenshot,
        createMockUseCase<DeleteProductScreenshot>() as unknown as DeleteProductScreenshot,
        createMockUseCase<AddProductLink>() as unknown as AddProductLink,
        createMockUseCase<UpdateProductLink>() as unknown as UpdateProductLink,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        publishProductUseCase as unknown as PublishProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockTranslationJobService()
      );

      await resolver.publishProduct({ slug: 'product-1' });

      expect(indexProductUseCase.execute).toHaveBeenCalledTimes(1);
      expect(indexProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'p1',
          name: 'Product 1',
          slug: 'product-1',
          summary: 'Summary 1',
          description: 'Description 1',
          tags: ['tag-a', 'tag-b'],
          category: 'category-1',
          publishedAt,
        })
      );
    });

    it('search index payload falls back to empty tags and category when product has none', async () => {
      const publishedAt = new Date();
      const product = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
      });

      const publishedProduct = new DomainProduct({
        ...product,
        publishedAt,
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(product);

      const publishProductUseCase = createMockUseCase<PublishProduct>();
      publishProductUseCase.execute.mockResolvedValue(publishedProduct);

      const getProductTagsUseCase = createMockUseCase<GetProductTags>();
      getProductTagsUseCase.execute.mockResolvedValue(null);

      const indexProductUseCase = createMockUseCase<IndexProduct>();
      indexProductUseCase.execute.mockResolvedValue(true);

      const resolver = new ProductPublishMutationResolver(
        new GetCompany(createCompanyRepository()),
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        createMockUseCase<EditProduct>() as unknown as EditProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        getProductTagsUseCase as unknown as GetProductTags,
        createMockUseCase<AddProductScreenshot>() as unknown as AddProductScreenshot,
        createMockUseCase<DeleteProductScreenshot>() as unknown as DeleteProductScreenshot,
        createMockUseCase<AddProductLink>() as unknown as AddProductLink,
        createMockUseCase<UpdateProductLink>() as unknown as UpdateProductLink,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        publishProductUseCase as unknown as PublishProduct,
        indexProductUseCase as unknown as IndexProduct,
        createMockTranslationJobService()
      );

      await resolver.publishProduct({ slug: 'product-1' });

      expect(indexProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
          category: '',
        })
      );
    });
  });
});
