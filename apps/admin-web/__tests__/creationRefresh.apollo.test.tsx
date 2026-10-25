// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable, type DocumentNode } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import * as documents from '@darun/provider-graphql';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNewCompanyForm } from '../../../libs/companies/feature/src/NewCompanyForm/useNewCompanyForm';
import { useNewProductFeatureForm } from '../../../libs/products/feature/src/NewProductFeatureForm/useNewProductFeatureForm';
import { useNewProductForm } from '../../../libs/products/feature/src/NewProductForm/useNewProductForm';
import { useNewProductLinkForm } from '../../../libs/products/feature/src/NewProductLinkForm/useNewProductLinkForm';
import { useNewProductScreenshotForm } from '../../../libs/products/feature/src/NewProductScreenshotForm/useNewProductScreenshotForm';

const { navigate, upload } = vi.hoisted(() => ({
  navigate: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => navigate }));
vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload }),
}));
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(() => 'saved-notice'), update: vi.fn() },
}));
const clients: ApolloClient[] = [];
afterEach(async () => {
  cleanup();
  await act(async () => {
    clients.splice(0).forEach(client => client.stop());
  });
  vi.clearAllMocks();
});
const file = new File(['image'], 'screen.png', { type: 'image/png' });
const props = { productSlug: 'parent-app', children: () => null };
const cases = [
  {
    name: 'company',
    inputField: 'name',
    useForm: () => {
      const form = useNewCompanyForm();
      return {
        submit: form.handleSubmit,
        form: form.form,
        setInput: () => form.form.setFieldValue('name', '편집 입력'),
      };
    },
    values: {
      name: '회사 A',
      type: '법인',
      address: '서울',
      startAtIsDisabled: false,
    },
    query: documents.AllCompaniesOnAllCompanyListTableDocument,
    variables: { page: 3 },
    read: { allCompanies: { totalCount: 0, totalPages: 0, companies: [] } },
    write: { createCompany: { company: { id: 'saved-company' } } },
    path: '/companies',
  },
  {
    name: 'product',
    inputField: 'name',
    useForm: () => {
      const state = useNewProductForm(props);
      return { ...state, setInput: () => state.form.setFieldValue('name', '편집 입력') };
    },
    values: { name: '앱 A', slug: 'requested-app', summary: '설명 A', file },
    query: documents.AllProductsOnProductListTableDocument,
    variables: { first: 7, after: 'page-two' },
    read: {
      allProducts: {
        edges: [],
        pageInfo: {
          endCursor: null,
          startCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      },
    },
    write: {
      createProduct: { product: { id: 'saved-product', slug: 'saved-app' } },
    },
    path: '/products/saved-app',
  },
  {
    name: 'feature',
    inputField: 'name',
    useForm: () => {
      const state = useNewProductFeatureForm(props);
      return { ...state, setInput: () => state.form.setFieldValue('name', '편집 입력') };
    },
    values: { name: '기능 A', emoji: '😀', summary: '기능 설명' },
    query: documents.TempProductBySlugOnProductFeatureTableDocument,
    variables: { slug: props.productSlug },
    read: { tempProductBySlug: null },
    write: {
      createProductFeature: {
        feature: { id: 'saved-feature', name: '기능 A' },
      },
    },
    path: '/products/parent-app',
  },
  {
    name: 'link',
    inputField: 'title',
    useForm: () => {
      const state = useNewProductLinkForm(props);
      return { ...state, setInput: () => state.form.setFieldValue('title', '편집 입력') };
    },
    values: {
      title: '공식',
      link: 'https://example.com',
      displayLink: 'example.com',
      iconUrl: 'web',
    },
    query: documents.TempProductBySlugOnProductLinkTableDocument,
    variables: { slug: props.productSlug },
    read: { tempProductBySlug: null },
    write: { addProductLink: { product: { id: 'parent-id', links: [] } } },
    path: '/products/parent-app',
  },
  {
    name: 'screenshot',
    inputField: 'imageAlt',
    useForm: () => {
      const state = useNewProductScreenshotForm(props);
      return { ...state, setInput: () => state.form.setFieldValue('imageAlt', '편집 입력') };
    },
    values: { file, imageAlt: '화면 A' },
    query: documents.GetProductScreenshotsOnDetailSectionDocument,
    variables: { slug: props.productSlug },
    read: { tempProductBySlug: null },
    write: {
      addProductScreenshot: { product: { id: 'parent-id', screenshots: [] } },
    },
    path: '/products/parent-app',
  },
];
function setup(query: DocumentNode, variables: Record<string, unknown>) {
  const requests: {
    name: string;
    variables: Record<string, unknown>;
    resolve: (data: object) => void;
    fail: () => void;
  }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          requests.push({
            name: operation.operationName ?? '',
            variables: operation.variables,
            resolve: data => {
              observer.next({ data });
              observer.complete();
            },
            fail: () => observer.error(new Error('synthetic failure')),
          });
        })
    ),
  });
  clients.push(client);
  const subscription = client.watchQuery({ query, variables }).subscribe({ next() {}, error() {} });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return { client, requests, subscription, wrapper };
}
async function settle(fn: () => void) {
  await act(async () => {
    fn();
  });
}

describe.each(cases)('$name creation with real Apollo client/link', c => {
  it('completes the saved write before refresh finishes and retries only the failed query', async () => {
    upload.mockResolvedValue('https://example.com/uploaded.png');
    const fixture = setup(c.query, c.variables);
    await settle(() => fixture.requests[0]!.resolve(c.read));
    const { result, unmount } = renderHook(() => c.useForm(), { wrapper: fixture.wrapper });
    await settle(() => {
      void result.current.submit({ ...c.values, startAtIsDisabled: false });
    });
    await waitFor(() => expect(fixture.requests).toHaveLength(2));
    await settle(() => fixture.requests[1]!.resolve(c.write));
    await waitFor(() => expect(fixture.requests).toHaveLength(3));
    expect(navigate).toHaveBeenCalledWith(c.path);
    await settle(() => {
      void result.current.submit({ ...c.values, startAtIsDisabled: false });
    });
    expect(fixture.requests).toHaveLength(3);
    unmount();
    fixture.subscription.unsubscribe();
    await settle(() => fixture.requests[2]!.fail());
    await waitFor(() => expect(notifications.update).toHaveBeenCalled());
    const notice = vi.mocked(notifications.update).mock.calls.at(-1)![0];
    expect(notice.color).toBe('yellow');
    render(<>{notice.message}</>);
    fireEvent.click(screen.getByRole('button', { name: '새로고침 다시 시도' }));
    await waitFor(() => expect(fixture.requests).toHaveLength(4));
    expect(fixture.requests[3]!.name).toBe(fixture.requests[0]!.name);
    expect(fixture.requests[3]!.variables).toEqual(c.variables);
    await settle(() => fixture.requests[3]!.fail());
    expect(screen.getByRole('button', { name: '새로고침 다시 시도' })).toHaveProperty('disabled', false);
    fireEvent.click(screen.getByRole('button', { name: '새로고침 다시 시도' }));
    await waitFor(() => expect(fixture.requests).toHaveLength(5));
    await settle(() => fixture.requests[4]!.resolve(c.read));
    await waitFor(() => expect(vi.mocked(notifications.update).mock.calls.at(-1)![0].color).toBe('teal'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledTimes(1);
    fixture.subscription.unsubscribe();
  });

  it('preserves input and permits a new write when the mutation itself fails', async () => {
    upload.mockResolvedValue('https://example.com/uploaded.png');
    const fixture = setup(c.query, c.variables);
    await settle(() => fixture.requests[0]!.resolve(c.read));
    const { result } = renderHook(() => c.useForm(), { wrapper: fixture.wrapper });
    await settle(() => {
      result.current.setInput();
    });
    await settle(() => {
      void result.current.submit({ ...c.values, startAtIsDisabled: false });
    });
    await waitFor(() => expect(fixture.requests).toHaveLength(2));
    await settle(() => fixture.requests[1]!.fail());
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.form.getValues()).toMatchObject({
      [c.inputField]: '편집 입력',
    });
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(vi.mocked(notifications.show).mock.calls[0]![0].color).toBe('red');
    await settle(() => {
      void result.current.submit({ ...c.values, startAtIsDisabled: false });
    });
    await waitFor(() => expect(fixture.requests).toHaveLength(3));
    expect(fixture.requests[2]!.name).toBe(fixture.requests[1]!.name);
    fixture.subscription.unsubscribe();
  });
});
