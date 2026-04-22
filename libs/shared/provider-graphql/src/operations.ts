import type {
  Company,
  CompanyPagination,
  CreateCompanyInput,
  CreateCompanyPayload,
  InputMaybe,
  Maybe,
  Scalars,
} from './core';
import type {
  CreateMagazineInput,
  CreateMagazinePayload,
  EditMagazineInput,
  EditMagazinePayload,
  Magazine,
  MagazinePagination,
  PublishMagazineInput,
  PublishMagazinePayload,
} from './magazine';
import type {
  AddProductLinkInput,
  AddProductLinkPayload,
  AddProductScreenshotInput,
  AddProductScreenshotPayload,
  CreateProductFeatureInput,
  CreateProductFeaturePayload,
  CreateProductInput,
  CreateProductPayload,
  EditProductInput,
  EditProductPayload,
  Feature,
  GenerateProductDescriptionInput,
  GenerateProductDescriptionPayload,
  IndexProductInput,
  IndexProductPayload,
  Product,
  ProductConnection,
  PublishProductInput,
  PublishProductPayload,
  RegisterProductCompanyInput,
  RegisterProductCompanyPayload,
  SignImageUploadInput,
  SignImageUploadPayload,
  UpdateAlternativeProductInput,
  UpdateAlternativeProductPayload,
  UpdateProductFeatureInput,
  UpdateProductFeaturePayload,
  UpdateProductLinkInput,
  UpdateProductLinkPayload,
  UpdateProductTagsInput,
  UpdateProductTagsPayload,
  UpvoteProductPayload,
} from './product';

export type Mutation = {
  readonly __typename?: 'Mutation';
  readonly addProductLink: AddProductLinkPayload;
  readonly addProductScreenshot: AddProductScreenshotPayload;
  readonly createCompany: CreateCompanyPayload;
  readonly createMagazine: CreateMagazinePayload;
  readonly createProduct: CreateProductPayload;
  readonly createProductFeature: CreateProductFeaturePayload;
  readonly editMagazine: EditMagazinePayload;
  readonly editProduct: EditProductPayload;
  readonly generateProductDescription: GenerateProductDescriptionPayload;
  readonly indexProduct: IndexProductPayload;
  readonly publishMagazine: PublishMagazinePayload;
  readonly publishProduct: PublishProductPayload;
  readonly registerProductCompany: RegisterProductCompanyPayload;
  readonly signImageUpload: SignImageUploadPayload;
  readonly updateAlternativeProduct: UpdateAlternativeProductPayload;
  readonly updateProductFeature: UpdateProductFeaturePayload;
  readonly updateProductLink: UpdateProductLinkPayload;
  readonly updateProductTags: UpdateProductTagsPayload;
  readonly upvoteProduct: UpvoteProductPayload;
};

export type MutationaddProductLinkArgs = {
  input: AddProductLinkInput;
  slug: Scalars['String']['input'];
};

export type MutationaddProductScreenshotArgs = {
  input: AddProductScreenshotInput;
  slug: Scalars['String']['input'];
};

export type MutationcreateCompanyArgs = {
  input: CreateCompanyInput;
};

export type MutationcreateMagazineArgs = {
  input: CreateMagazineInput;
};

export type MutationcreateProductArgs = {
  input: CreateProductInput;
};

export type MutationcreateProductFeatureArgs = {
  input: CreateProductFeatureInput;
};

export type MutationeditMagazineArgs = {
  input: EditMagazineInput;
  slug: Scalars['String']['input'];
};

export type MutationeditProductArgs = {
  input: EditProductInput;
  slug: Scalars['String']['input'];
};

export type MutationgenerateProductDescriptionArgs = {
  input: GenerateProductDescriptionInput;
};

export type MutationindexProductArgs = {
  input: IndexProductInput;
};

export type MutationpublishMagazineArgs = {
  input: PublishMagazineInput;
};

export type MutationpublishProductArgs = {
  input: PublishProductInput;
};

export type MutationregisterProductCompanyArgs = {
  input: RegisterProductCompanyInput;
  slug: Scalars['String']['input'];
};

export type MutationsignImageUploadArgs = {
  input: SignImageUploadInput;
};

export type MutationupdateAlternativeProductArgs = {
  input: UpdateAlternativeProductInput;
  slug: Scalars['String']['input'];
};

export type MutationupdateProductFeatureArgs = {
  id: Scalars['String']['input'];
  input: UpdateProductFeatureInput;
};

export type MutationupdateProductLinkArgs = {
  id: Scalars['String']['input'];
  input: UpdateProductLinkInput;
  slug: Scalars['String']['input'];
};

export type MutationupdateProductTagsArgs = {
  input: UpdateProductTagsInput;
  slug: Scalars['String']['input'];
};

export type MutationupvoteProductArgs = {
  slug: Scalars['String']['input'];
};

export type Query = {
  readonly __typename?: 'Query';
  readonly allCompanies: CompanyPagination;
  readonly allProducts: ProductConnection;
  readonly feature?: Maybe<Feature>;
  readonly hello: Scalars['String']['output'];
  readonly magazine?: Maybe<Magazine>;
  readonly magazineBySlug?: Maybe<Magazine>;
  readonly product?: Maybe<Product>;
  readonly productBySlug?: Maybe<Product>;
  readonly productsCount: Scalars['Int']['output'];
  readonly rankedProducts: ReadonlyArray<Product>;
  readonly recentProducts: ReadonlyArray<Product>;
  readonly searchCompanies: ReadonlyArray<Company>;
  readonly searchProducts: ReadonlyArray<Product>;
  readonly tempAllMagazines: MagazinePagination;
  readonly tempMagazineBySlug?: Maybe<Magazine>;
  readonly tempProductBySlug?: Maybe<Product>;
};

export type QueryallCompaniesArgs = {
  page: Scalars['Int']['input'];
};

export type QueryallProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryfeatureArgs = {
  id: Scalars['ID']['input'];
};

export type QuerymagazineArgs = {
  id: Scalars['ID']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type QuerymagazineBySlugArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
};

export type QueryproductArgs = {
  id: Scalars['ID']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type QueryproductBySlugArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
};

export type QueryrankedProductsArgs = {
  first: Scalars['Int']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type QueryrecentProductsArgs = {
  first: Scalars['Int']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type QuerysearchCompaniesArgs = {
  query: Scalars['String']['input'];
};

export type QuerysearchProductsArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  query: Scalars['String']['input'];
};

export type QuerytempAllMagazinesArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  page: Scalars['Int']['input'];
};

export type QuerytempMagazineBySlugArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
};

export type QuerytempProductBySlugArgs = {
  locale?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
};
