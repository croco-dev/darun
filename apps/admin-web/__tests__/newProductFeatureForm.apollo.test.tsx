// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { NewProductFeatureFormSection } from '../features/products/NewProductFeatureFormSection';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@darun/utils-router', () => ({
  useNavigate: () => navigate,
  Link: (props: React.ComponentProps<'a'>) => <a {...props} />,
}));
vi.mock(
  '@darun/products-feature',
  async () => import('../../../libs/products/feature/src/NewProductFeatureForm/NewProductFeatureForm')
);
vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn(() => 'saved-notice'), update: vi.fn() },
}));
vi.mock('@emoji-mart/react', () => ({
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native: string }) => void }) => (
    <div>
      {['✅', '🟣'].map(native => (
        <button key={native} type="button" onClick={() => onEmojiSelect({ native })}>
          {native}
        </button>
      ))}
    </div>
  ),
}));

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.stop());
  vi.clearAllMocks();
});

function mountForm() {
  const writes: Record<string, unknown>[] = [];
  let complete: (success: boolean) => void = () => {
    throw new Error('No pending mutation');
  };
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          if (operation.operationName === 'CreateProductFeatureOnNewProductFeatureForm') {
            writes.push(structuredClone(operation.variables));
            complete = success => {
              if (success) {
                observer.next({
                  data: {
                    createProductFeature: {
                      feature: { id: 'new-feature', name: '검색' },
                    },
                  },
                });
                observer.complete();
              } else observer.error(new Error('synthetic save failure'));
            };
          } else {
            observer.next({ data: { tempProductBySlug: null } });
            observer.complete();
          }
        })
    ),
  });
  clients.push(client);
  render(
    <ApolloProvider client={client}>
      <NewProductFeatureFormSection productSlug="fixture-app" />
    </ApolloProvider>
  );
  fireEvent.change(screen.getByLabelText('이름'), {
    target: { value: '검색' },
  });
  fireEvent.change(screen.getByLabelText('짧은 설명'), {
    target: { value: '저장할 설명' },
  });
  return { writes, complete: (success: boolean) => complete(success) };
}

function typeEmoji(value: string) {
  fireEvent.change(screen.getByLabelText('이모지'), { target: { value } });
}

function pickEmoji(value: string) {
  fireEvent.click(screen.getByLabelText('이모지 선택기 열기'));
  fireEvent.click(screen.getByRole('button', { name: value }));
}

it.each([
  [
    'typing then picking',
    () => {
      typeEmoji('🔴');
      pickEmoji('✅');
    },
    '✅',
  ],
  [
    'consecutive picks',
    () => {
      pickEmoji('✅');
      pickEmoji('🟣');
    },
    '🟣',
  ],
  [
    'picking then typing',
    () => {
      pickEmoji('✅');
      typeEmoji('🔵');
    },
    '🔵',
  ],
] as const)('submits the displayed last emoji after %s and clears the saved form', async (_, change, emoji) => {
  const fixture = mountForm();
  change();
  expect((screen.getByLabelText('이모지') as HTMLInputElement).value).toBe(emoji);
  fireEvent.click(screen.getByRole('button', { name: '등록' }));
  await waitFor(() =>
    expect(fixture.writes).toEqual([
      {
        input: {
          productSlug: 'fixture-app',
          name: '검색',
          emoji,
          summary: '저장할 설명',
        },
      },
    ])
  );
  await act(async () => fixture.complete(true));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/products/fixture-app'));
  for (const label of ['이름', '이모지', '짧은 설명']) {
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('');
  }
});

it('keeps the selected emoji and other inputs after a failed save for retry', async () => {
  const fixture = mountForm();
  typeEmoji('🔴');
  pickEmoji('✅');
  fireEvent.click(screen.getByRole('button', { name: '등록' }));
  await waitFor(() => expect(fixture.writes).toHaveLength(1));
  await act(async () => fixture.complete(false));
  expect(navigate).not.toHaveBeenCalled();
  expect((screen.getByLabelText('이모지') as HTMLInputElement).value).toBe('✅');
  expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('검색');
  expect((screen.getByLabelText('짧은 설명') as HTMLTextAreaElement).value).toBe('저장할 설명');
  fireEvent.click(screen.getByRole('button', { name: '등록' }));
  await waitFor(() => expect(fixture.writes).toHaveLength(2));
  expect(fixture.writes[1]).toEqual(fixture.writes[0]);
  await act(async () => fixture.complete(true));
});
