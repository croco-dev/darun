// @vitest-environment jsdom
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientRootProvider } from '../app/client';
import { container } from '../app/container';

const state = vi.hoisted(() => ({ locale: 'ko' }));
vi.mock('next-intl', () => ({ useLocale: () => state.locale }));
vi.mock('next-client-cookies', () => ({
  useCookies: () => ({ get: () => undefined, set: () => {}, remove: () => {} }),
}));
vi.mock('@darun/analytics-client', () => ({ initPostHog: () => {} }));
vi.mock('@darun/provider-auth/client', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@darun/ui', () => ({ ToastProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@darun/ui-layout', () => ({ MotionProvider: ({ children }: { children: React.ReactNode }) => children }));

const query = gql`
  query ProviderLocaleRegression($locale: String!) {
    productBySlug(slug: "provider-locale", locale: $locale) {
      id
      name
      voteCount
      features {
        id
        name
      }
    }
  }
`;

function Product() {
  const { data } = useQuery<{ productBySlug: { name: string; voteCount: number; features: { name: string }[] } }>(
    query,
    {
      variables: { locale: state.locale },
    }
  );
  return <output>{JSON.stringify(data?.productBySlug)}</output>;
}

function write(locale: string, voteCount = 2) {
  container.getApolloClient(locale).writeQuery({
    query,
    variables: { locale },
    data: {
      productBySlug: {
        __typename: 'Product',
        id: 'provider-locale',
        name: locale === 'ko' ? '한글 상품' : 'English product',
        voteCount,
        features: [
          { __typename: 'Feature', id: 'provider-feature', name: locale === 'ko' ? '한글 기능' : 'English feature' },
        ],
      },
    },
  });
}

afterEach(() => {
  cleanup();
  state.locale = 'ko';
});

describe('ClientRootProvider locale transitions', () => {
  it('switches the mounted provider and reuses the returning locale cache', async () => {
    write('ko');
    write('en', 7);
    const view = render(
      <ClientRootProvider>
        <Product />
      </ClientRootProvider>
    );
    expect(screen.getByRole('status').textContent).toContain('한글 상품');
    state.locale = 'en';
    view.rerender(
      <ClientRootProvider>
        <Product />
      </ClientRootProvider>
    );
    expect(screen.getByRole('status').textContent).toContain('English feature');
    await act(async () => {
      write('ko', 4);
    });
    expect(screen.getByRole('status').textContent).toContain('English product');
    expect(screen.getByRole('status').textContent).toContain('"voteCount":7');
    state.locale = 'ko';
    view.rerender(
      <ClientRootProvider>
        <Product />
      </ClientRootProvider>
    );
    expect(screen.getByRole('status').textContent).toContain('한글 기능');
    expect(screen.getByRole('status').textContent).toContain('"voteCount":4');
    await act(async () => {
      write('ko', 9);
    });
    expect(screen.getByRole('status').textContent).toContain('"voteCount":9');
  });
});
