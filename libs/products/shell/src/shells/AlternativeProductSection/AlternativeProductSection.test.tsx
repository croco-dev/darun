import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { print } from '@apollo/client/utilities';
import { NextIntlClientProvider } from 'next-intl';
import React, { act, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AlternativeProductSection } from './AlternativeProductSection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const featureOperation = 'ProductWithFeaturesOnProductAlternativeList';
const messages = {
  Alternative: {
    more: { title: 'Alternatives', description: 'Compare similar services' },
    empty: {
      title: 'No alternatives',
      description: 'Explore the catalog',
      button: 'Search',
    },
    list: { feature: { title: 'Key features' }, browseMore: 'Browse more' },
  },
  ProductDetail: { compareButton: { add: 'Add to comparison' } },
};

it.each([
  [0, 'en'],
  [1, 'ko'],
  [2, 'en'],
] as const)(
  'renders %i alternatives in %s from one feature-inclusive operation and reuses its cache',
  async (count, locale) => {
    const alternatives = Array.from({ length: count }, (_, index) => ({
      __typename: 'Product',
      id: `alternative-${index}`,
      slug: `alternative-${index}`,
      name: `${locale} product ${index}`,
      summary: `${locale} summary ${index}`,
      logoUrl: '/logo.svg',
      tags: [
        {
          __typename: 'Tag',
          id: `tag-${index}`,
          name: `${locale} tag ${index}`,
        },
      ],
      description: 'Unused body',
      features: [
        {
          __typename: 'Feature',
          id: `feature-${index}`,
          name: `${locale} feature ${index}`,
          summary: null,
          emoji: '⭐',
        },
      ],
    })).reverse();
    let currentAlternatives = alternatives;
    const operations: {
      name: string | undefined;
      variables: Record<string, unknown>;
      query: string;
    }[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        operation =>
          new Observable(observer => {
            operations.push({
              name: operation.operationName,
              variables: operation.variables,
              query: print(operation.query),
            });
            observer.next({
              data: {
                productBySlug: {
                  __typename: 'Product',
                  id: 'source',
                  alternatives: currentAlternatives,
                },
              },
            });
            observer.complete();
          })
      ),
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const renderSection = (key: string) =>
      act(async () =>
        root.render(
          <NextIntlClientProvider locale={locale} timeZone="UTC" messages={messages}>
            <ApolloProvider client={client}>
              <Suspense fallback="Loading">
                <AlternativeProductSection
                  key={key}
                  slug="source"
                  alternativeIds={currentAlternatives.map(p => p.id)}
                />
              </Suspense>
            </ApolloProvider>
          </NextIntlClientProvider>
        )
      );

    try {
      await renderSection('cold');
      expect(operations.map(operation => operation.name)).toEqual([featureOperation]);
      expect(operations[0].variables).toEqual({ slug: 'source', locale });
      expect(operations[0].query).toMatch(/\bfeatures\s*\{/);
      expect(operations[0].query).not.toMatch(/\bdescription\b/);
      expect(!!container.querySelector('[data-testid="alt-empty"]')).toBe(count === 0);
      const list = container.querySelector('[role="group"]');
      const links = [...(list?.querySelectorAll('a[href*="/products/"]') ?? [])];
      expect(links.map(link => link.getAttribute('href'))).toEqual(
        alternatives.map(product => `/${locale}/products/${product.slug}?from=related`)
      );
      for (const [index, product] of alternatives.entries()) {
        const card = list?.children[index];
        expect(card?.contains(links[index])).toBe(true);
        expect(card?.textContent).toContain(product.name);
        expect(card?.textContent).toContain(product.tags[0].name);
        expect(card?.textContent).toContain(product.features[0].name);
      }
      expect(container.querySelectorAll('[data-testid="compare-button"]')).toHaveLength(count);

      await renderSection('warm');
      expect(operations).toHaveLength(1);
      if (count > 0) {
        const removedProduct = currentAlternatives[0];
        currentAlternatives = currentAlternatives.slice(1);
        await renderSection('after-exclusion');
        expect(operations.map(operation => operation.name)).toEqual([featureOperation, featureOperation]);
        expect(container.textContent).not.toContain(removedProduct.name);
        expect(!!container.querySelector('[data-testid="alt-empty"]')).toBe(count === 1);
        expect(container.querySelectorAll('[data-testid="compare-button"]')).toHaveLength(count - 1);
        await renderSection('after-exclusion-warm');
        expect(operations).toHaveLength(2);
      }
    } finally {
      await act(async () => root.unmount());
      client.stop();
      container.remove();
    }
  }
);
