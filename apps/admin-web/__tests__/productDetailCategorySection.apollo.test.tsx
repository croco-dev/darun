// @vitest-environment jsdom
import { ApolloLink, Observable } from '@apollo/client';
import { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  AdminProductCategorySelectionOnProductDetailCategorySectionDocument,
  ProductAlternativeManagementDocument,
  UpdateProductCategoriesOnProductDetailCategorySectionDocument,
} from '@darun/provider-graphql';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ProductAlternativeManagement } from '../features/products/ProductDetailAlternativeSection/ProductAlternativeManagement';
import { ProductDetailCategorySection } from '../features/products/ProductDetailCategorySection';

afterEach(cleanup);

function alternatives(id: string, name: string) {
  return {
    tempProductBySlug: {
      __typename: 'Product' as const,
      id: 'product',
      alternativeManagement: {
        __typename: 'ProductAlternativeManagement' as const,
        automatic: [{ __typename: 'Product' as const, id, name }],
        exclusions: [],
      },
    },
  };
}

it.each([
  { scenario: 'successful refresh', readFails: false, holdInitialRead: false },
  { scenario: 'failed refresh', readFails: true, holdInitialRead: false },
  { scenario: 'late initial response', readFails: false, holdInitialRead: true },
])('refreshes automatic alternatives after category save ($scenario)', async ({ readFails, holdInitialRead }) => {
  const slug = 'fixture-product';
  const alternativesRequest = { query: ProductAlternativeManagementDocument, variables: { slug } };
  const initialAlternatives = alternatives('old', '협업 도구');
  let deliverInitialRead: (() => void) | undefined;
  const holdFirstRead = new ApolloLink((operation, forward) => {
    if (!holdInitialRead || operation.operationName !== 'ProductAlternativeManagement' || deliverInitialRead) {
      return forward(operation);
    }
    return new Observable(observer => {
      deliverInitialRead = () => {
        observer.next({ data: initialAlternatives });
        observer.complete();
      };
    });
  });
  const responses = new MockLink([
    {
      request: { query: AdminProductCategorySelectionOnProductDetailCategorySectionDocument, variables: { slug } },
      result: {
        data: {
          adminProductCategorySelection: {
            __typename: 'AdminProductCategorySelection',
            productId: 'product',
            categoryIds: ['before'],
            categories: [
              { __typename: 'Category', id: 'before', slug: 'before', labelKo: '협업' },
              { __typename: 'Category', id: 'after', slug: 'after', labelKo: '디자인' },
            ],
          },
        },
      },
    },
    ...(holdInitialRead ? [] : [{ request: alternativesRequest, result: { data: initialAlternatives } }]),
    {
      request: {
        query: UpdateProductCategoriesOnProductDetailCategorySectionDocument,
        variables: { productId: 'product', categoryIds: ['after'] },
      },
      result: { data: { updateProductCategories: ['after'] } },
    },
    readFails
      ? { request: alternativesRequest, error: new Error('추천 조회 실패') }
      : { request: alternativesRequest, result: { data: alternatives('new', '디자인 도구') } },
    ...(readFails ? [{ request: alternativesRequest, result: { data: alternatives('new', '디자인 도구') } }] : []),
  ]);
  render(
    <MockedProvider link={holdFirstRead.concat(responses)}>
      <>
        <ProductDetailCategorySection slug={slug} />
        <ProductAlternativeManagement slug={slug} />
      </>
    </MockedProvider>
  );

  if (holdInitialRead) await waitFor(() => expect(deliverInitialRead).toBeDefined());
  else await screen.findByRole('button', { name: '협업 도구 자동 대안에서 제외' });
  await screen.findByRole('link', { name: '협업' });
  fireEvent.click(screen.getByRole('button', { name: '카테고리 편집' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '협업' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '디자인' }));
  fireEvent.click(screen.getByRole('button', { name: '카테고리 저장' }));

  await screen.findByText('카테고리를 저장했습니다.');
  expect(screen.getByRole('link', { name: '디자인' }).getAttribute('href')).toBe(
    'https://darun.io/ko/categories/after'
  );
  const expectedAction = readFails ? '자동 대안 다시 조회' : '디자인 도구 자동 대안에서 제외';
  await screen.findByRole('button', { name: expectedAction });
  await act(async () => deliverInitialRead?.());
  expect(screen.getByRole('button', { name: expectedAction })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '협업 도구 자동 대안에서 제외' })).toBeNull();
  if (readFails) {
    fireEvent.click(screen.getByRole('button', { name: '자동 대안 다시 조회' }));
    await screen.findByRole('button', { name: '디자인 도구 자동 대안에서 제외' });
    expect(screen.getByText('카테고리를 저장했습니다.')).toBeTruthy();
  }
});
