export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.This scalar is serialized to a string in ISO 8601 format and parsed from a string in ISO 8601 format. */
  DateTimeISO: { input: unknown; output: unknown; }
};

export type AddProductLinkInput = {
  readonly displayLink: Scalars['String']['input'];
  readonly iconUrl: Scalars['String']['input'];
  readonly link: Scalars['String']['input'];
  readonly title: Scalars['String']['input'];
};

export type AddProductLinkPayload = {
  readonly __typename?: 'AddProductLinkPayload';
  readonly product?: Maybe<Product>;
};

export type AddProductScreenshotInput = {
  readonly imageAlt: Scalars['String']['input'];
  readonly imageUrl: Scalars['String']['input'];
};

export type AddProductScreenshotPayload = {
  readonly __typename?: 'AddProductScreenshotPayload';
  readonly product?: Maybe<Product>;
};

export type Company = {
  readonly __typename?: 'Company';
  readonly address: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
  readonly startAt: Scalars['DateTimeISO']['output'];
  readonly type: Scalars['String']['output'];
};

export type CompanyPagination = {
  readonly __typename?: 'CompanyPagination';
  readonly companies: ReadonlyArray<Company>;
  readonly totalCount: Scalars['Int']['output'];
  readonly totalPages: Scalars['Int']['output'];
};

export type CreateCompanyInput = {
  readonly address: Scalars['String']['input'];
  readonly name: Scalars['String']['input'];
  readonly startAt: Scalars['DateTimeISO']['input'];
  readonly type: Scalars['String']['input'];
};

export type CreateCompanyPayload = {
  readonly __typename?: 'CreateCompanyPayload';
  readonly company: Company;
};

export type CreateProductFeatureInput = {
  readonly emoji: Scalars['String']['input'];
  readonly name: Scalars['String']['input'];
  readonly productSlug: Scalars['String']['input'];
  readonly summary: Scalars['String']['input'];
};

export type CreateProductFeaturePayload = {
  readonly __typename?: 'CreateProductFeaturePayload';
  readonly feature: Feature;
};

export type CreateProductInput = {
  readonly description?: InputMaybe<Scalars['String']['input']>;
  readonly logoUrl: Scalars['String']['input'];
  readonly name: Scalars['String']['input'];
  readonly slug: Scalars['String']['input'];
  readonly summary: Scalars['String']['input'];
};

export type CreateProductPayload = {
  readonly __typename?: 'CreateProductPayload';
  readonly product: Product;
};

export type EditProductInput = {
  readonly description?: InputMaybe<Scalars['String']['input']>;
  readonly logoUrl?: InputMaybe<Scalars['String']['input']>;
  readonly name?: InputMaybe<Scalars['String']['input']>;
  readonly summary?: InputMaybe<Scalars['String']['input']>;
};

export type EditProductPayload = {
  readonly __typename?: 'EditProductPayload';
  readonly product: Product;
};

export type Feature = {
  readonly __typename?: 'Feature';
  readonly emoji: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
  readonly screenshots: ReadonlyArray<FeatureScreenshot>;
  readonly summary?: Maybe<Scalars['String']['output']>;
};

export type FeatureScreenshot = {
  readonly __typename?: 'FeatureScreenshot';
  readonly id: Scalars['ID']['output'];
  readonly imageAlt: Scalars['String']['output'];
  readonly imageUrl: Scalars['String']['output'];
};

export type IndexProductInput = {
  readonly slug: Scalars['String']['input'];
};

export type IndexProductPayload = {
  readonly __typename?: 'IndexProductPayload';
  readonly indexed: Scalars['Boolean']['output'];
};

export type Link = {
  readonly __typename?: 'Link';
  readonly displayLink: Scalars['String']['output'];
  readonly iconUrl: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly isPrimary: Scalars['Boolean']['output'];
  readonly link: Scalars['String']['output'];
  readonly title: Scalars['String']['output'];
};

export type Mutation = {
  readonly __typename?: 'Mutation';
  readonly addProductLink: AddProductLinkPayload;
  readonly addProductScreenshot: AddProductScreenshotPayload;
  readonly createCompany: CreateCompanyPayload;
  readonly createProduct: CreateProductPayload;
  readonly createProductFeature: CreateProductFeaturePayload;
  readonly editProduct: EditProductPayload;
  readonly indexProduct: IndexProductPayload;
  readonly publishProduct: PublishProductPayload;
  readonly signImageUpload: SignImageUploadPayload;
  readonly updateAlternativeProduct: UpdateAlternativeProductPayload;
  readonly updateProductFeature: UpdateProductFeaturePayload;
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


export type MutationcreateProductArgs = {
  input: CreateProductInput;
};


export type MutationcreateProductFeatureArgs = {
  input: CreateProductFeatureInput;
};


export type MutationeditProductArgs = {
  input: EditProductInput;
  slug: Scalars['String']['input'];
};


export type MutationindexProductArgs = {
  input: IndexProductInput;
};


export type MutationpublishProductArgs = {
  input: PublishProductInput;
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


export type MutationupdateProductTagsArgs = {
  input: UpdateProductTagsInput;
  slug: Scalars['String']['input'];
};


export type MutationupvoteProductArgs = {
  slug: Scalars['String']['input'];
};

export type PageInfo = {
  readonly __typename?: 'PageInfo';
  readonly endCursor?: Maybe<Scalars['String']['output']>;
  readonly hasNextPage: Scalars['Boolean']['output'];
  readonly hasPreviousPage: Scalars['Boolean']['output'];
  readonly startCursor?: Maybe<Scalars['String']['output']>;
};

export type Product = {
  readonly __typename?: 'Product';
  readonly alternatives: ReadonlyArray<Product>;
  readonly description?: Maybe<Scalars['String']['output']>;
  readonly features: ReadonlyArray<Feature>;
  readonly id: Scalars['ID']['output'];
  readonly links: ReadonlyArray<Link>;
  readonly logoUrl: Scalars['String']['output'];
  readonly name: Scalars['String']['output'];
  readonly ownedCompany?: Maybe<Company>;
  readonly ownedCompanyId?: Maybe<Scalars['String']['output']>;
  readonly publishedAt?: Maybe<Scalars['DateTimeISO']['output']>;
  readonly screenshots: ReadonlyArray<Screenshot>;
  readonly slug: Scalars['String']['output'];
  readonly summary: Scalars['String']['output'];
  readonly tags: ReadonlyArray<Tag>;
  readonly updatedAt?: Maybe<Scalars['DateTimeISO']['output']>;
  readonly voteCount: Scalars['Int']['output'];
};

export type ProductConnection = {
  readonly __typename?: 'ProductConnection';
  readonly edges: ReadonlyArray<ProductEdge>;
  readonly pageInfo: PageInfo;
  readonly totalCount: Scalars['Int']['output'];
};

export type ProductEdge = {
  readonly __typename?: 'ProductEdge';
  readonly cursor: Scalars['String']['output'];
  readonly node: Product;
};

export type PublishProductInput = {
  readonly slug: Scalars['String']['input'];
};

export type PublishProductPayload = {
  readonly __typename?: 'PublishProductPayload';
  readonly product: Product;
};

export type Query = {
  readonly __typename?: 'Query';
  readonly allCompanies: CompanyPagination;
  readonly allProducts: ProductConnection;
  readonly feature?: Maybe<Feature>;
  readonly hello: Scalars['String']['output'];
  readonly product?: Maybe<Product>;
  readonly productBySlug?: Maybe<Product>;
  readonly productsCount: Scalars['Int']['output'];
  readonly recentProducts: ReadonlyArray<Product>;
  readonly searchProducts: ReadonlyArray<Product>;
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


export type QueryproductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryrecentProductsArgs = {
  first: Scalars['Int']['input'];
};


export type QuerysearchProductsArgs = {
  query: Scalars['String']['input'];
};


export type QuerytempProductBySlugArgs = {
  slug: Scalars['String']['input'];
};

export type Screenshot = {
  readonly __typename?: 'Screenshot';
  readonly id: Scalars['ID']['output'];
  readonly imageAlt: Scalars['String']['output'];
  readonly imageUrl: Scalars['String']['output'];
};

export type SignImageUploadInput = {
  readonly displayName: Scalars['String']['input'];
  readonly folder: Scalars['String']['input'];
};

export type SignImageUploadPayload = {
  readonly __typename?: 'SignImageUploadPayload';
  readonly folder: Scalars['String']['output'];
  readonly signature: Scalars['String']['output'];
  readonly timestamp: Scalars['Float']['output'];
};

export type Tag = {
  readonly __typename?: 'Tag';
  readonly count: Scalars['Int']['output'];
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
};

export type UpdateAlternativeProductInput = {
  readonly alternativeProductIds: ReadonlyArray<Scalars['String']['input']>;
};

export type UpdateAlternativeProductPayload = {
  readonly __typename?: 'UpdateAlternativeProductPayload';
  readonly product?: Maybe<Product>;
};

export type UpdateProductFeatureInput = {
  readonly emoji?: InputMaybe<Scalars['String']['input']>;
  readonly name?: InputMaybe<Scalars['String']['input']>;
  readonly summary?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductFeaturePayload = {
  readonly __typename?: 'UpdateProductFeaturePayload';
  readonly feature: Feature;
};

export type UpdateProductTagsInput = {
  readonly tagNames: ReadonlyArray<Scalars['String']['input']>;
};

export type UpdateProductTagsPayload = {
  readonly __typename?: 'UpdateProductTagsPayload';
  readonly product?: Maybe<Product>;
};

export type UpvoteProductPayload = {
  readonly __typename?: 'UpvoteProductPayload';
  readonly product?: Maybe<Product>;
};
