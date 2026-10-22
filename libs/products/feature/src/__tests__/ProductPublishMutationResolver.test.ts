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
  UpdateProductScreenshot,
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
    translateProductWithFeatures: vi.fn(() => new Promise(() => {})),
    requestProductTranslationJob: vi.fn().mockResolvedValue({ id: 'job-1', status: 'pending', queued: true }),
  }) as unknown as TranslationJobService;

describe('ProductPublishMutationResolver', () => {
  describe('publishProduct', () => {
    it('indexes the product and waits only for translation job registration', async () => {
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

      let completeRegistration!: (
        job: Awaited<ReturnType<TranslationJobService['requestProductTranslationJob']>>
      ) => void;
      const registration = new Promise<Awaited<ReturnType<TranslationJobService['requestProductTranslationJob']>>>(
        resolve => {
          completeRegistration = resolve;
        }
      );
      const translationJobService = createMockTranslationJobService();
      vi.mocked(translationJobService.requestProductTranslationJob).mockReturnValue(registration);

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
        createMockUseCase<UpdateProductScreenshot>() as unknown as UpdateProductScreenshot,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        publishProductUseCase as unknown as PublishProduct,
        indexProductUseCase as unknown as IndexProduct,
        translationJobService
      );

      const onResponse = vi.fn();
      const response = resolver.publishProduct({ slug: 'product-1' }).then(onResponse);
      await vi.waitFor(() => {
        expect(translationJobService.requestProductTranslationJob).toHaveBeenCalledWith('p1');
      });
      expect(onResponse).not.toHaveBeenCalled();
      expect(translationJobService.translateProductWithFeatures).not.toHaveBeenCalled();

      completeRegistration({
        id: 'job-1',
        entityType: 'Product',
        entityId: 'p1',
        status: 'pending',
        queued: true,
      });
      await response;
      expect(onResponse).toHaveBeenCalledWith({ product: publishedProduct });

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

    it('returns the published product and logs a translation registration failure', async () => {
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

      const registrationError = new Error('translation job registration failed');
      const translationJobService = createMockTranslationJobService();
      vi.mocked(translationJobService.requestProductTranslationJob).mockRejectedValue(registrationError);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
        createMockUseCase<UpdateProductScreenshot>() as unknown as UpdateProductScreenshot,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        publishProductUseCase as unknown as PublishProduct,
        indexProductUseCase as unknown as IndexProduct,
        translationJobService
      );

      try {
        await expect(resolver.publishProduct({ slug: 'product-1' })).resolves.toEqual({ product: publishedProduct });
        expect(translationJobService.requestProductTranslationJob).toHaveBeenCalledWith('p1');
        expect(translationJobService.translateProductWithFeatures).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
          '[products] publishProduct side effect contract violated: translation-job-trigger severity=degraded logLevel=warn returnPath=omit',
          registrationError
        );
      } finally {
        warn.mockRestore();
      }

      expect(indexProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
          category: '',
        })
      );
    });
  });

  describe('W6 published sync (single index update, idempotent intent)', () => {
    function publishedProduct() {
      return new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
        description: 'Description 1',
        categoryIds: [],
        publishedAt: new Date('2026-10-11T00:00:00Z'),
      });
    }

    function resolverWith(
      editResult: DomainProduct,
      indexUseCase: ReturnType<typeof createMockUseCase<IndexProduct>>,
      translation: TranslationJobService
    ) {
      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(editResult);
      const editProductUseCase = createMockUseCase<EditProduct>();
      editProductUseCase.execute.mockResolvedValue(editResult);
      return new ProductPublishMutationResolver(
        new GetCompany(createCompanyRepository()),
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        editProductUseCase as unknown as EditProduct,
        indexUseCase as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        createMockUseCase<GetProductTags>() as unknown as GetProductTags,
        createMockUseCase<AddProductScreenshot>() as unknown as AddProductScreenshot,
        createMockUseCase<DeleteProductScreenshot>() as unknown as DeleteProductScreenshot,
        createMockUseCase<AddProductLink>() as unknown as AddProductLink,
        createMockUseCase<UpdateProductLink>() as unknown as UpdateProductLink,
        createMockUseCase<UpdateProductScreenshot>() as unknown as UpdateProductScreenshot,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        createMockUseCase<PublishProduct>() as unknown as PublishProduct,
        createMockUseCase<IndexProduct>() as unknown as IndexProduct,
        translation
      );
    }

    it('does one logical index update on published edit (no double index write)', async () => {
      const updated = publishedProduct();
      const coreIndex = createMockUseCase<IndexProduct>();
      coreIndex.execute.mockResolvedValue(true);
      const translation = createMockTranslationJobService();
      const resolver = resolverWith(updated, coreIndex, translation);

      await resolver.editProduct('product-1', { name: 'Updated Name' });

      // super.editProduct의 색인 1회만 수행되고, 이 override는 색인을 추가하지 않는다.
      expect(coreIndex.execute).toHaveBeenCalledTimes(1);
      expect(translation.requestProductTranslationJob).toHaveBeenCalledTimes(1);
      expect(translation.requestProductTranslationJob).toHaveBeenCalledWith('p1');
    });

    it('replays idempotently without regressing a newer revision', async () => {
      const committed = publishedProduct();
      const staleSnapshot = new DomainProduct({
        ...committed,
        summary: 'Stale summary',
        updatedAt: new Date('2026-10-10T00:00:00Z'),
      });
      const newerCommitted = new DomainProduct({
        ...committed,
        summary: 'Newer summary',
        updatedAt: new Date('2026-10-12T00:00:00Z'),
      });
      const indexUseCase = createMockUseCase<IndexProduct>();
      indexUseCase.execute.mockResolvedValue(true);
      const getProductUseCase = createMockUseCase<GetProduct>();
      // syncPublishedContent 내부 재조회가 더 새 리비전을 반환한다.
      getProductUseCase.execute.mockResolvedValue(newerCommitted);
      const getProductTagsUseCase = createMockUseCase<GetProductTags>();
      getProductTagsUseCase.execute.mockResolvedValue(null);
      const translation = createMockTranslationJobService();
      const resolver = new ProductPublishMutationResolver(
        new GetCompany(createCompanyRepository()),
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        createMockUseCase<EditProduct>() as unknown as EditProduct,
        createMockUseCase<IndexProduct>() as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        getProductTagsUseCase as unknown as GetProductTags,
        createMockUseCase<AddProductScreenshot>() as unknown as AddProductScreenshot,
        createMockUseCase<DeleteProductScreenshot>() as unknown as DeleteProductScreenshot,
        createMockUseCase<AddProductLink>() as unknown as AddProductLink,
        createMockUseCase<UpdateProductLink>() as unknown as UpdateProductLink,
        createMockUseCase<UpdateProductScreenshot>() as unknown as UpdateProductScreenshot,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        createMockUseCase<PublishProduct>() as unknown as PublishProduct,
        indexUseCase as unknown as IndexProduct,
        translation
      );

      const staleAsProduct = {
        id: staleSnapshot.id,
        slug: staleSnapshot.slug,
        name: staleSnapshot.name,
        summary: staleSnapshot.summary,
        description: staleSnapshot.description,
        publishedAt: staleSnapshot.publishedAt,
      };
      // revision guard: 오래된 스냅샷 재실행은 색인 쓰기를 건너뛴다.
      await (
        resolver as unknown as { syncPublishedContent: (p: unknown, o: unknown) => Promise<void> }
      ).syncPublishedContent(staleAsProduct, { expectedUpdatedAt: staleSnapshot.updatedAt });
      expect(indexUseCase.execute).not.toHaveBeenCalled();
      // 번역 intent 기록은 정식 경로에서 시도된다(중복 dedup은 서비스 계층 소유).
      expect(translation.requestProductTranslationJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('editProduct', () => {
    it('registers a translation job when published product content changes', async () => {
      const product = new DomainProduct({
        id: 'p1',
        slug: 'product-1',
        name: 'Product 1',
        summary: 'Summary 1',
        logoUrl: 'https://example.com/logo.png',
        description: 'Description 1',
        categoryIds: [],
        publishedAt: new Date(),
      });

      const updatedProduct = new DomainProduct({
        ...product,
        name: 'Updated Name',
      });

      const getProductUseCase = createMockUseCase<GetProduct>();
      getProductUseCase.execute.mockResolvedValue(product);

      const editProductUseCase = createMockUseCase<EditProduct>();
      editProductUseCase.execute.mockResolvedValue(updatedProduct);

      const mockTranslationJobService = createMockTranslationJobService();

      const resolver = new ProductPublishMutationResolver(
        new GetCompany(createCompanyRepository()),
        createMockUseCase<CreateProduct>() as unknown as CreateProduct,
        editProductUseCase as unknown as EditProduct,
        createMockUseCase<IndexProduct>() as unknown as IndexProduct,
        createMockUseCase<UpdateProductTag>() as unknown as UpdateProductTag,
        getProductUseCase as unknown as GetProduct,
        createMockUseCase<GetProductTags>() as unknown as GetProductTags,
        createMockUseCase<AddProductScreenshot>() as unknown as AddProductScreenshot,
        createMockUseCase<DeleteProductScreenshot>() as unknown as DeleteProductScreenshot,
        createMockUseCase<AddProductLink>() as unknown as AddProductLink,
        createMockUseCase<UpdateProductLink>() as unknown as UpdateProductLink,
        createMockUseCase<UpdateProductScreenshot>() as unknown as UpdateProductScreenshot,
        createMockUseCase<RegisterProductCompany>() as unknown as RegisterProductCompany,
        createMockUseCase<GenerateProductDescription>() as unknown as GenerateProductDescription,
        createMockUseCase<PublishProduct>() as unknown as PublishProduct,
        createMockUseCase<IndexProduct>() as unknown as IndexProduct,
        mockTranslationJobService
      );

      await resolver.editProduct('product-1', { name: 'Updated Name' });

      expect(mockTranslationJobService.requestProductTranslationJob).toHaveBeenCalledTimes(1);
      expect(mockTranslationJobService.requestProductTranslationJob).toHaveBeenCalledWith('p1');
      expect(mockTranslationJobService.translateProductWithFeatures).not.toHaveBeenCalled();
    });
  });
});
