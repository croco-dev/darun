// @vitest-environment jsdom
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { ApolloProvider } from '@apollo/client/react';
import { MagazineContentPage } from '@darun/pages-shell';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React, { Component, Suspense } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import en from '../messages/en.json';
import ko from '../messages/ko.json';

vi.mock('@darun/ui-layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} />,
}));
const { buildSchema } = createRequire(`${process.cwd()}/package.json`)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync('../graphql-api/schema.graphql', 'utf8'));
const body =
  '<h2>Choosing a service</h2><p>Read the full analysis.</p><ul><li>First option</li><li>Second option</li></ul><ol><li>Compare</li></ol><a href="https://example.com/source">Original source</a><img src="/fixture.png" alt="Comparison diagram"><table><thead><tr><th>Plan</th><th>Price</th></tr></thead><tbody><tr><td>Starter</td><td>$12</td></tr></tbody></table>';

class Boundary extends Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <div role="alert">{this.state.error.message}</div> : this.props.children;
  }
}

afterEach(cleanup);

async function show(content: string | null, locale: 'ko' | 'en' = 'ko', failure?: 'missing' | 'reject') {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new SchemaLink({
      schema,
      rootValue: {
        magazineBySlug: () => {
          if (failure === 'reject') throw new Error('fixture query unavailable');
          if (failure === 'missing') return null;
          return {
            id: 'magazine-fixture',
            title: 'Stored magazine',
            summary: 'Existing summary',
            content,
            backgroundImageUrl: '/cover.png',
            publishedAt: '2026-10-20T12:00:00.000Z',
            author: { id: 'writer', name: 'Ada' },
          };
        },
      },
    }),
  });
  return await act(async () =>
    render(
      <NextIntlClientProvider locale={locale} messages={locale === 'ko' ? ko : en} timeZone="Asia/Seoul">
        <ApolloProvider client={client}>
          <Boundary>
            <Suspense fallback={<p>Loading fixture</p>}>
              <MagazineContentPage params={{ slug: 'stored-magazine' }} title="Stored magazine" />
            </Suspense>
          </Boundary>
        </ApolloProvider>
      </NextIntlClientProvider>
    )
  );
}

describe('published magazine reading', () => {
  it('queries and renders stored HTML structure without changing the existing header', async () => {
    const view = await show(body);
    const article = await screen.findByRole('article');
    expect(article.getAttribute('aria-label')).toBe('‘Stored magazine’ 본문');
    expect(
      within(article).getByRole('heading', {
        name: 'Choosing a service',
        level: 2,
      })
    ).toBeTruthy();
    expect(within(article).getByText('Read the full analysis.')).toBeTruthy();
    expect(within(article).getAllByRole('list')).toHaveLength(2);
    expect(within(article).getByRole('link', { name: 'Original source' }).getAttribute('href')).toBe(
      'https://example.com/source'
    );
    expect(within(article).getByRole('img', { name: 'Comparison diagram' }).getAttribute('src')).toBe('/fixture.png');
    expect(within(article).getByRole('columnheader', { name: 'Plan' })).toBeTruthy();
    expect(within(article).getByRole('cell', { name: '$12' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Stored magazine', level: 1 })).toBeTruthy();
    expect(screen.getByText('Existing summary')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(view.container.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-20T12:00:00.000Z');
  });

  it.each(['ko', 'en'] as const)('localizes the empty article and interpolates its title in %s', async locale => {
    await show(null, locale);
    const article = await screen.findByRole('article');
    expect(article.getAttribute('aria-label')).toBe(
      locale === 'ko' ? '‘Stored magazine’ 본문' : '‘Stored magazine’ article'
    );
    expect(
      within(article).getByText(locale === 'ko' ? '아직 본문이 없습니다.' : 'This article has no body yet.')
    ).toBeTruthy();
    expect(screen.getByText('Existing summary')).toBeTruthy();
  });

  it('removes executable HTML while preserving safe article content', async () => {
    await show(
      body +
        '<script>window.magazineXss = 1</script><img src="x" onerror="window.magazineXss = 2"><a href="javascript:alert(1)">Unsafe link</a><iframe src="https://example.com"></iframe>'
    );
    const article = await screen.findByRole('article');
    expect(article.querySelector('script, iframe, [onerror]')).toBeNull();
    expect(within(article).getByText('Unsafe link').getAttribute('href')).toBeNull();
    expect(within(article).getByRole('heading', { name: 'Choosing a service' })).toBeTruthy();
  });

  it.each(['missing', 'reject'] as const)('keeps %s separate from a magazine with an empty body', async failure => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await show(null, 'ko', failure);
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain(
        failure === 'missing' ? 'NEXT_HTTP_ERROR_FALLBACK;404' : 'fixture query unavailable'
      );
      expect(screen.queryByRole('article')).toBeNull();
      expect(screen.queryByText('아직 본문이 없습니다.')).toBeNull();
    } finally {
      errors.mockRestore();
    }
  });
});
