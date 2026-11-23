import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { notifications } from '@mantine/notifications';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditProductFeatureItem } from '../EditProductFeatureItem';

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('@emoji-mart/react', () => ({ default: () => null }));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function mountEditor(summary: string | null) {
  const feature = { __typename: 'Feature', id: 'feature-1', emoji: '🔎', name: '검색', summary };
  const writes: Record<string, unknown>[] = [];
  const onSubmit = vi.fn();
  let failNext = false;
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'FeatureOnEditProductFeatureItem') {
            observer.next({ data: { feature: { ...feature } } });
            observer.complete();
          } else if (operation.operationName === 'UpdateProductFeatureOnEditProductFeatureItem') {
            writes.push(structuredClone(operation.variables));
            if (failNext) {
              failNext = false;
              observer.error(new Error('synthetic save failure'));
              return;
            }
            Object.assign(feature, operation.variables.input);
            observer.next({ data: { updateProductFeature: { feature: { id: feature.id } } } });
            observer.complete();
          } else observer.error(new Error(`Unexpected operation: ${operation.operationName}`));
        })
    ),
  });
  clients.push(client);
  const open = () =>
    render(
      <ApolloProvider client={client}>
        <EditProductFeatureItem featureId={feature.id} onSubmit={onSubmit} />
      </ApolloProvider>
    );
  return { feature, writes, onSubmit, open, fail: () => (failNext = true) };
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const change = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));
const loaded = () => waitFor(() => expect(input('기능 이름 (name)').value).toBe('검색'));

it('reports both length errors and accepts corrected Unicode values at the storage limits', async () => {
  const fixture = mountEditor('기존 요약');
  fixture.open();
  await loaded();
  const name = '🔎'.repeat(99) + '검';
  const summary = '🚀'.repeat(254) + '색';
  change('기능 이름 (name)', name + '가');
  change('요약 (summary)', summary + '나');
  save();

  expect(input('기능 이름 (name)').getAttribute('aria-invalid')).toBe('true');
  expect(input('요약 (summary)').getAttribute('aria-invalid')).toBe('true');
  expect(screen.getAllByRole('alert').map(alert => alert.textContent)).toEqual([
    '기능 이름은 100자 이내로 입력해 주세요.',
    '요약은 255자 이내로 입력해 주세요.',
  ]);
  expect(fixture.writes).toEqual([]);

  change('기능 이름 (name)', ` ${name} `);
  change('요약 (summary)', ` ${summary} `);
  save();
  await waitFor(() => expect(fixture.onSubmit).toHaveBeenCalledOnce());
  expect(fixture.writes).toEqual([{ featureId: 'feature-1', input: { name, summary, emoji: '🔎' } }]);
});

it('saves name and emoji changes on a feature without a summary and reads them on reopening', async () => {
  const fixture = mountEditor(null);
  const view = fixture.open();
  await loaded();
  change('기능 이름 (name)', ' 통합 검색 ');
  change('이모지', ' 🚀 ');
  save();
  await waitFor(() => expect(fixture.onSubmit).toHaveBeenCalledOnce());
  expect(fixture.writes).toEqual([
    { featureId: 'feature-1', input: { name: '통합 검색', emoji: '🚀', summary: null } },
  ]);
  view.unmount();
  fixture.open();
  await waitFor(() => expect(input('기능 이름 (name)').value).toBe('통합 검색'));
  expect(input('이모지').value).toBe('🚀');
  expect(input('요약 (summary)').value).toBe('');
});

it.each(['', '   '])('clears a saved summary with explicit null when the input is %j', async value => {
  const fixture = mountEditor('기존 요약');
  const view = fixture.open();
  await loaded();
  change('요약 (summary)', value);
  save();
  await waitFor(() => expect(fixture.onSubmit).toHaveBeenCalledOnce());
  expect(fixture.writes).toEqual([{ featureId: 'feature-1', input: { name: '검색', emoji: '🔎', summary: null } }]);
  view.unmount();
  fixture.open();
  await loaded();
  expect(input('요약 (summary)').value).toBe('');
});

it('preserves the draft after failure and retries the same trimmed summary', async () => {
  const fixture = mountEditor('기존 요약');
  fixture.open();
  await loaded();
  change('요약 (summary)', ' 새 요약 ');
  fixture.fail();
  save();
  await waitFor(() =>
    expect(notifications.show).toHaveBeenCalledWith({ message: 'synthetic save failure', color: 'red' })
  );
  expect(input('요약 (summary)').value).toBe(' 새 요약 ');
  expect(fixture.onSubmit).not.toHaveBeenCalled();
  expect(fixture.feature.summary).toBe('기존 요약');
  save();
  await waitFor(() => expect(fixture.onSubmit).toHaveBeenCalledOnce());
  expect(fixture.writes).toEqual([
    { featureId: 'feature-1', input: { name: '검색', emoji: '🔎', summary: '새 요약' } },
    { featureId: 'feature-1', input: { name: '검색', emoji: '🔎', summary: '새 요약' } },
  ]);
});

it.each([
  ['이모지', '이모지를 입력해주세요.'],
  ['기능 이름 (name)', '기능 이름을 입력해주세요.'],
])('keeps %s required even without a summary', async (label, message) => {
  const fixture = mountEditor(null);
  fixture.open();
  await loaded();
  change(label, '   ');
  save();
  await act(async () => {});
  expect(screen.getByText(message)).toBeDefined();
  expect(fixture.writes).toEqual([]);
  expect(fixture.onSubmit).not.toHaveBeenCalled();
});
