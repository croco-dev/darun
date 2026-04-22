export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar.This scalar is serialized to a string in ISO 8601 format and parsed from a string in ISO 8601 format. */
  DateTimeISO: { input: unknown; output: unknown };
};

export type PageInfo = {
  readonly __typename?: 'PageInfo';
  readonly endCursor?: Maybe<Scalars['String']['output']>;
  readonly hasNextPage: Scalars['Boolean']['output'];
  readonly hasPreviousPage: Scalars['Boolean']['output'];
  readonly startCursor?: Maybe<Scalars['String']['output']>;
};

export type Company = {
  readonly __typename?: 'Company';
  readonly address: Scalars['String']['output'];
  readonly id: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
  readonly startAt?: Maybe<Scalars['DateTimeISO']['output']>;
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
  readonly startAt?: InputMaybe<Scalars['DateTimeISO']['input']>;
  readonly type: Scalars['String']['input'];
};

export type CreateCompanyPayload = {
  readonly __typename?: 'CreateCompanyPayload';
  readonly company: Company;
};
