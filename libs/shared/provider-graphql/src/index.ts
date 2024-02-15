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

export type Link = {
  readonly __typename?: 'Link';
  readonly displayLink: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly isPrimary: Scalars['Boolean']['output'];
  readonly link: Scalars['String']['output'];
  readonly logoUrl: Scalars['String']['output'];
  readonly title: Scalars['String']['output'];
};

export type Product = {
  readonly __typename?: 'Product';
  readonly description?: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly links: ReadonlyArray<Link>;
  readonly logoUrl: Scalars['String']['output'];
  readonly name: Scalars['String']['output'];
  readonly summary: Scalars['String']['output'];
};

export type Query = {
  readonly __typename?: 'Query';
  readonly hello: Scalars['String']['output'];
  readonly product?: Maybe<Product>;
  readonly productBySlug?: Maybe<Product>;
  readonly recentProducts: ReadonlyArray<Product>;
};


export type QueryproductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryproductBySlugArgs = {
  slug: Scalars['String']['input'];
};
