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
};

export type CreateProductInput = {
  readonly logoUrl: Scalars['String']['input'];
  readonly name: Scalars['String']['input'];
  readonly slug: Scalars['String']['input'];
  readonly summary: Scalars['String']['input'];
};

export type CreateProductPayload = {
  readonly __typename?: 'CreateProductPayload';
  readonly product: Product;
};

export type Link = {
  readonly __typename?: 'Link';
  readonly displayLink: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly isPrimary: Scalars['Boolean']['output'];
  readonly link: Scalars['String']['output'];
  readonly logoUrl: Scalars['String']['output'];
  readonly title: Scalars['String']['output'];
};

export type Mutation = {
  readonly __typename?: 'Mutation';
  readonly createProduct: CreateProductPayload;
};


export type MutationcreateProductArgs = {
  input: CreateProductInput;
};

export type Product = {
  readonly __typename?: 'Product';
  readonly description?: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly links: ReadonlyArray<Link>;
  readonly logoUrl: Scalars['String']['output'];
  readonly name: Scalars['String']['output'];
  readonly screenshots: ReadonlyArray<Screenshot>;
  readonly slug: Scalars['String']['output'];
  readonly summary: Scalars['String']['output'];
  readonly tags: ReadonlyArray<Tag>;
};

export type Query = {
  readonly __typename?: 'Query';
  readonly hello: Scalars['String']['output'];
  readonly product?: Maybe<Product>;
  readonly productBySlug?: Maybe<Product>;
  readonly productsCount: Scalars['Int']['output'];
  readonly recentProducts: ReadonlyArray<Product>;
};


export type QueryproductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductBySlugArgs = {
  slug: Scalars['String']['input'];
};

export type Screenshot = {
  readonly __typename?: 'Screenshot';
  readonly id: Scalars['ID']['output'];
  readonly imageAlt: Scalars['String']['output'];
  readonly imageUrl: Scalars['String']['output'];
};

export type Tag = {
  readonly __typename?: 'Tag';
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
};
