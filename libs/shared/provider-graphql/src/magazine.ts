import type { InputMaybe, Maybe, Scalars } from './core';

export type Author = {
  readonly __typename?: 'Author';
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
};

export type Magazine = {
  readonly __typename?: 'Magazine';
  readonly author?: Maybe<Author>;
  readonly authorId: Scalars['String']['output'];
  readonly backgroundImageUrl: Scalars['String']['output'];
  readonly content?: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly publishedAt?: Maybe<Scalars['DateTimeISO']['output']>;
  readonly slug: Scalars['String']['output'];
  readonly summary?: Maybe<Scalars['String']['output']>;
  readonly title: Scalars['String']['output'];
  readonly updatedAt?: Maybe<Scalars['DateTimeISO']['output']>;
};

export type MagazinePagination = {
  readonly __typename?: 'MagazinePagination';
  readonly magazines: ReadonlyArray<Magazine>;
  readonly totalCount: Scalars['Int']['output'];
  readonly totalPages: Scalars['Int']['output'];
};

export type CreateMagazineInput = {
  readonly backgroundImageUrl: Scalars['String']['input'];
  readonly logoImageUrl?: InputMaybe<Scalars['String']['input']>;
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  readonly summary?: InputMaybe<Scalars['String']['input']>;
  readonly title: Scalars['String']['input'];
};

export type CreateMagazinePayload = {
  readonly __typename?: 'CreateMagazinePayload';
  readonly magazine: Magazine;
};

export type EditMagazineInput = {
  readonly backgroundImageUrl?: InputMaybe<Scalars['String']['input']>;
  readonly content?: InputMaybe<Scalars['String']['input']>;
  readonly logoImageUrl?: InputMaybe<Scalars['String']['input']>;
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  readonly summary?: InputMaybe<Scalars['String']['input']>;
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

export type EditMagazinePayload = {
  readonly __typename?: 'EditMagazinePayload';
  readonly magazine: Magazine;
};

export type PublishMagazineInput = {
  readonly slug: Scalars['String']['input'];
};

export type PublishMagazinePayload = {
  readonly __typename?: 'PublishMagazinePayload';
  readonly magazine: Magazine;
};
