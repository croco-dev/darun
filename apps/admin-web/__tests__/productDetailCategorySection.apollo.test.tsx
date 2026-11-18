// @vitest-environment jsdom
import { MockedProvider } from '@apollo/client/testing/react';
import {
  AdminProductCategorySelectionOnProductDetailCategorySectionDocument,
  ProductAlternativeManagementDocument,
  UpdateProductCategoriesOnProductDetailCategorySectionDocument,
} from '@darun/provider-graphql';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

it.each([false, true])('refreshes automatic alternatives after category save (read fails: %s)', async readFails => {
  const slug = 'fixture-product';
  const alternativesRequest = { query: ProductAlternativeManagementDocument, variables: { slug } };
  render(
    <MockedProvider
      mocks={[
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
        { request: alternativesRequest, result: { data: alternatives('old', '협업 도구') } },
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
      ]}
    >
      <>
        <ProductDetailCategorySection slug={slug} />
        <ProductAlternativeManagement slug={slug} />
      </>
    </MockedProvider>
  );

  await screen.findByRole('button', { name: '협업 도구 자동 대안에서 제외' });
  await screen.findByRole('link', { name: '협업' });
  fireEvent.click(screen.getByRole('button', { name: '카테고리 편집' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '협업' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '디자인' }));
  fireEvent.click(screen.getByRole('button', { name: '카테고리 저장' }));

  await screen.findByText('카테고리를 저장했습니다.');
  expect(screen.getByRole('link', { name: '디자인' }).getAttribute('href')).toBe(
    'https://darun.io/ko/categories/after'
  );
  await screen.findByRole('button', { name: readFails ? '자동 대안 다시 조회' : '디자인 도구 자동 대안에서 제외' });
  expect(screen.queryByRole('button', { name: '협업 도구 자동 대안에서 제외' })).toBeNull();
});
