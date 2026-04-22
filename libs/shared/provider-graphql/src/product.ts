import type { Company, InputMaybe, Maybe, PageInfo, Scalars } from './core';

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

export type GenerateProductDescriptionInput = {
  readonly slug: Scalars['String']['input'];
};

export type GenerateProductDescriptionPayload = {
  readonly __typename?: 'GenerateProductDescriptionPayload';
  readonly product: Product;
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

export type RegisterProductCompanyInput = {
  readonly companyId: Scalars['ID']['input'];
};

export type RegisterProductCompanyPayload = {
  readonly __typename?: 'RegisterProductCompanyPayload';
  readonly product?: Maybe<Product>;
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

export type UpdateProductLinkInput = {
  readonly displayLink?: InputMaybe<Scalars['String']['input']>;
  readonly iconUrl?: InputMaybe<Scalars['String']['input']>;
  readonly link?: InputMaybe<Scalars['String']['input']>;
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProductLinkPayload = {
  readonly __typename?: 'UpdateProductLinkPayload';
  readonly product?: Maybe<Product>;
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
