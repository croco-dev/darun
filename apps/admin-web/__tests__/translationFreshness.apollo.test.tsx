// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { EditProductInfo } from '@darun/products-feature';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { TranslationRecovery } from '../features/llm-jobs/TranslationRecovery';
import { ProductDetailDescriptionSection } from '../features/products/ProductDetailDescriptionSection/ProductDetailDescriptionSection';
import { ProductDetailFeatureSection } from '../features/products/ProductDetailFeatureSection/ProductDetailFeatureSection';
import { ProductDetailInfoSection } from '../features/products/ProductDetailInfoSection/ProductDetailInfoSection';

vi.mock('@darun/products-feature', async () => ({
  ...(await import('../../../libs/products/feature/src/EditProductInfo/EditProductInfo')),
  ...(await import('../../../libs/products/feature/src/EditProductDescription/EditProductDescription')),
  ...(await import('../../../libs/products/feature/src/EditProductFeatureItem/EditProductFeatureItem')),
  ...(await import('../../../libs/products/feature/src/ProductFeatureTable/ProductFeatureTable')),
  ...(await import('../../../libs/products/feature/src/GenerateProductDescriptionButton/GenerateProductDescriptionButton')),
  ProductInfo: () => null,
  ProductDescription: () => null,
  IndexProductButton: () => null,
  PublishProductButton: () => null,
}));
vi.mock('@darun/ui-admin', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/ui-admin')>()),
  Editor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="설명" value={value} onChange={event => onChange(event.target.value)} />
  ),
}));
vi.mock('@darun/utils-router', () => ({
  Link: (props: ComponentProps<'a'>) => <a {...props} />,
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/products/sample',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@emoji-mart/react', () => ({ default: () => null }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
});

function mount() {
  const otherProduct = {
    __typename: 'Product',
    id: 'product-b',
    name: 'Other service',
    summary: 'Other summary',
  };
  const product = {
    __typename: 'Product',
    id: 'product-a',
    name: 'Sample',
    summary: 'Summary',
    publishedAt: '2026-11-01T00:00:00Z',
    slug: 'sample',
    logoUrl: null,
    description: '<p>Original introduction</p>',
    features: [
      { __typename: 'Feature', id: 'feature-a', emoji: '🔎', name: 'Lookup', summary: 'Original summary' },
      { __typename: 'Feature', id: 'feature-b', emoji: '🔔', name: 'Alerts', summary: 'Original summary' },
    ],
  };
  const staleFields = new Set<string>();
  const reads: string[] = [];
  const writes: string[] = [];
  let deferReads = false;
  let completeJob = false;
  const candidate = {
    __typename: 'ProductDescriptionJob',
    id: 'candidate-a',
    productId: product.id,
    status: 'completed',
    candidateHtml: '<p>Accepted candidate</p>',
    appliedAt: null,
    message: null,
    error: null,
  };
  const pendingReads: ((success: boolean) => void)[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const response = (data: object) => {
            observer.next({ data });
            observer.complete();
          };
          const { operationName, variables } = operation;
          if (operationName === 'TranslationFreshnessOnAdminRecovery') {
            const { entityType, entityId, fields } = variables;
            reads.push(entityId);
            const rows = (type: string, id: string, names: string[]) =>
              names.map(field => ({
                __typename: 'TranslationFreshness',
                entityType: type,
                entityId: id,
                field,
                status: staleFields.has(`${id}:${field}`) ? 'stale' : 'current',
              }));
            const data = rows(
              entityType,
              entityId,
              fields.filter((field: string) => field !== 'features')
            );
            if (fields.includes('features')) {
              data.push(
                ...product.features.flatMap(feature => rows('ProductFeature', feature.id, ['name', 'summary']))
              );
            }
            if (deferReads) {
              pendingReads.push(success => {
                if (success) response({ translationFreshness: data });
                else observer.error(new Error('Freshness unavailable'));
              });
            } else response({ translationFreshness: data });
          } else if (operationName?.startsWith('EditProductOn')) {
            writes.push(operationName);
            for (const [field, value] of Object.entries(variables.input)) {
              if (product[field as keyof typeof product] !== value) staleFields.add(`${product.id}:${field}`);
            }
            Object.assign(product, variables.input);
            response({ editProduct: { product: { ...product } } });
          } else if (operationName === 'UpdateProductFeatureOnEditProductFeatureItem') {
            writes.push(operationName);
            const feature = product.features.find(feature => feature.id === variables.featureId)!;
            for (const field of ['name', 'summary'] as const) {
              if (feature[field] !== variables.input[field]) staleFields.add(`${feature.id}:${field}`);
            }
            Object.assign(feature, variables.input);
            response({ updateProductFeature: { feature: { ...feature } } });
          } else if (operationName === 'FeatureOnEditProductFeatureItem') {
            response({ feature: { ...product.features.find(feature => feature.id === variables.id) } });
          } else if (operationName === 'GetProductDescriptionJob') {
            response({ tempProductBySlug: { ...product }, productDescriptionJob: candidate });
          } else if (operationName === 'ApplyProductDescriptionCandidate') {
            writes.push(operationName);
            product.description = candidate.candidateHtml;
            staleFields.add(`${product.id}:description`);
            response({
              applyProductDescriptionCandidate: {
                alreadyApplied: false,
                product: { ...product },
                job: { ...candidate, appliedAt: '2026-11-13T22:00:00Z' },
              },
            });
          } else if (operationName === 'RequestProductTranslationOnAdminRecovery') {
            writes.push(operationName);
            response({ requestProductTranslation: { id: 'job-a', status: 'pending' } });
          } else if (operationName === 'TranslationJobOnAdminRecovery') {
            response({ translationJob: { id: 'job-a', status: completeJob ? 'completed' : 'pending', error: null } });
          } else if (operationName?.includes('Product')) {
            response({
              tempProductBySlug:
                variables.slug === 'other'
                  ? { ...otherProduct }
                  : { ...product, features: product.features.map(feature => ({ ...feature })) },
            });
          } else observer.error(new Error(`Unexpected operation: ${operationName}`));
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <section aria-label="상품 A">
        <ProductDetailInfoSection slug="sample" />
        <ProductDetailDescriptionSection slug="sample" />
        <ProductDetailFeatureSection slug="sample" />
      </section>
      <section aria-label="다른 상품">
        <TranslationRecovery entityType="Product" entityId="product-b" fields={['name']} />
        <EditProductInfo slug="other" />
      </section>
    </ApolloProvider>
  );
  return {
    reads,
    writes,
    pendingReads,
    defer: (value: boolean) => (deferReads = value),
    finishAutomaticTranslation: () => staleFields.clear(),
    finishRequestedTranslation: () => {
      completeJob = true;
      staleFields.clear();
    },
  };
}

const productSection = () => within(screen.getByRole('region', { name: '상품 A' }));
const productStatuses = () => productSection().getAllByText(/description:/)[0];
const save = () => fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));

async function start() {
  const fixture = mount();
  await waitFor(() => expect(productStatuses().textContent).toContain('description: current'));
  await waitFor(() =>
    expect(fixture.reads).toEqual(expect.arrayContaining(['product-a', 'product-b', 'feature-a', 'feature-b']))
  );
  fixture.reads.length = 0;
  return fixture;
}

it('refreshes only the edited product after saving its name and summary, and retries a failed read without saving again', async () => {
  const fixture = await start();
  fixture.defer(true);
  const otherSection = within(screen.getByRole('region', { name: '다른 상품' }));
  const otherName = () => otherSection.getByLabelText('서비스 이름') as HTMLInputElement;
  await waitFor(() => expect(otherName().value).toBe('Other service'));
  fireEvent.change(otherName(), { target: { value: '다른 상품의 미저장 입력' } });
  fireEvent.click(productSection().getByRole('button', { name: '기본 정보 수정' }));
  await waitFor(() =>
    expect((within(screen.getByRole('dialog')).getByLabelText('서비스 이름') as HTMLInputElement).value).toBe('Sample')
  );
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('서비스 이름'), { target: { value: 'Changed' } });
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('서비스 요약 (summary)'), {
    target: { value: 'Changed summary' },
  });
  save();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(fixture.reads).toEqual(['product-a']));
  expect(productSection().getByText('번역 최신 여부 확인 중...')).toBeDefined();
  expect(productSection().queryByText(/description: current/)).toBeNull();
  await act(async () => fixture.pendingReads[0](false));
  expect(productSection().getByRole('alert').textContent).toContain('번역 상태를 확인하지 못했습니다.');
  expect(productSection().queryByText(/description: current/)).toBeNull();

  fixture.defer(false);
  fireEvent.click(
    within(productSection().getByText('번역 상태를 확인하지 못했습니다.').parentElement!).getByRole('button', {
      name: '번역 상태 새로고침',
    })
  );
  await waitFor(() => expect(productStatuses().textContent).toContain('name: stale / summary: stale'));
  fixture.finishAutomaticTranslation();
  fireEvent.click(within(productStatuses().parentElement!).getByRole('button', { name: '번역 상태 새로고침' }));
  await waitFor(() => expect(productStatuses().textContent).toContain('name: current / summary: current'));
  expect(fixture.reads).toEqual(['product-a', 'product-a', 'product-a']);
  expect(fixture.writes).toEqual(['EditProductOnEditProductInfo']);
  expect(otherName().value).toBe('다른 상품의 미저장 입력');
});

it('refreshes the product after description save and again when a requested translation completes', async () => {
  const fixture = await start();
  fireEvent.click(productSection().getByRole('button', { name: '수정' }));
  const editor = await screen.findByLabelText('설명');
  await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain('Original introduction'));
  fireEvent.change(editor, { target: { value: '<p>Edited introduction</p>' } });
  save();
  await waitFor(() => expect(productStatuses().textContent).toContain('description: stale'));
  fireEvent.click(within(productStatuses().parentElement!).getByRole('button', { name: '영어 번역 재시도' }));
  await productSection().findByText(/job-a \/ pending/);
  expect(productStatuses().textContent).toContain('description: stale');
  expect(fixture.reads).toEqual(['product-a']);
  fixture.finishRequestedTranslation();
  await productSection().findByText(/job-a \/ completed/, undefined, { timeout: 3500 });
  await waitFor(() => expect(productStatuses().textContent).toContain('description: current'));
  expect(fixture.reads).toEqual(['product-a', 'product-a']);
  expect(fixture.writes).toEqual(['EditProductOnEditProductDescription', 'RequestProductTranslationOnAdminRecovery']);
});

it('refreshes an edited feature and its parent aggregate without refreshing sibling features', async () => {
  const fixture = await start();
  const row = within(screen.getByRole('row', { name: /Lookup/ }));
  fireEvent.click(row.getByRole('button', { name: '정보 수정' }));
  const name = () => screen.getByLabelText('기능 이름 (name)') as HTMLTextAreaElement;
  await waitFor(() => expect(name().value).toBe('Lookup'));
  fireEvent.change(screen.getByLabelText('요약 (summary)'), { target: { value: 'Updated feature summary' } });
  save();
  const updatedRow = await screen.findByRole('row', { name: /Updated feature summary/ });
  await within(updatedRow).findByText('name: current / summary: stale');
  await waitFor(() => expect(productStatuses().textContent).toContain('name: current / summary: stale'));
  expect(fixture.reads.slice().sort()).toEqual(['feature-a', 'product-a']);
  expect(fixture.writes).toEqual(['UpdateProductFeatureOnEditProductFeatureItem']);
});

it('refreshes published source status after applying a description candidate', async () => {
  const fixture = await start();
  fireEvent.change(screen.getByRole('textbox', { name: '후보 작업 ID로 다시 열기' }), {
    target: { value: 'candidate-a' },
  });
  fireEvent.click(screen.getByRole('button', { name: '후보 다시 열기' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'AI 소개 초안 검토' }));
  fireEvent.click(dialog.getByRole('button', { name: '적용하기' }));
  await waitFor(() => expect(productStatuses().textContent).toContain('description: stale'));
  expect(fixture.reads).toEqual(['product-a']);
  expect(fixture.writes).toEqual(['ApplyProductDescriptionCandidate']);
});

it('ignores a freshness response started before the source save', async () => {
  const fixture = await start();
  fixture.defer(true);
  fireEvent.click(within(productStatuses().parentElement!).getByRole('button', { name: '번역 상태 새로고침' }));
  await waitFor(() => expect(fixture.pendingReads).toHaveLength(1));

  fireEvent.click(productSection().getByRole('button', { name: '기본 정보 수정' }));
  const name = () => within(screen.getByRole('dialog')).getByLabelText('서비스 이름') as HTMLInputElement;
  await waitFor(() => expect(name().value).toBe('Sample'));
  fireEvent.change(name(), { target: { value: 'Changed while reading' } });
  save();
  await waitFor(() => expect(fixture.pendingReads).toHaveLength(2));
  await act(async () => fixture.pendingReads[1](true));
  await waitFor(() => expect(productStatuses().textContent).toContain('name: stale'));
  await act(async () => fixture.pendingReads[0](true));
  expect(productStatuses().textContent).toContain('name: stale');
});
