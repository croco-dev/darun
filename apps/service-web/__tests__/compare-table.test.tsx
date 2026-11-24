import { createTranslator } from 'next-intl';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import ComparePage from '../app/[locale]/compare/[slug1]/[slug2]/page';
import en from '../messages/en.json';
import ko from '../messages/ko.json';

const product1 = {
  id: '1',
  slug: 'studio',
  name: 'Studio',
  tags: [],
  voteCount: 2,
};
const product2 = {
  id: '2',
  slug: 'workshop',
  name: 'Workshop',
  tags: [],
  voteCount: 7,
};

vi.mock('../app/getServerClient', () => ({
  getClient: () => ({ query: async () => ({ data: { product1, product2 } }) }),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale }: { locale: 'ko' | 'en' }) =>
    createTranslator({
      locale,
      messages: locale === 'ko' ? ko : en,
      namespace: 'Compare',
    }),
}));
vi.mock('@darun/ui-layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@darun/products-shell', () => ({
  ProductCard: () => null,
  ProductVoteCount: () => null,
}));

it.each([
  ['ko', '상세 비교표', ['서비스명', '설명', '회사', '투표 수', '태그']],
  ['en', 'Detailed comparison', ['Service Name', 'Overview', 'Company', 'Votes', 'Tags']],
] as const)('renders a named %s table and localized headers in the server HTML', async (locale, title, rowNames) => {
  const markup = renderToStaticMarkup(
    await ComparePage({
      params: Promise.resolve({
        locale,
        slug1: product1.slug,
        slug2: product2.slug,
      }),
    })
  );

  expect(markup).toMatch(new RegExp(`<table[^>]*aria-label="[^"]+${title}"`));
  const columns = [...markup.matchAll(/<th[^>]*scope="col"[^>]*>(.*?)<\/th>/g)].map(
    ([, content]) => content.match(/<span[^>]*>([^<]+)<\/span>$/)?.[1]
  );
  expect(columns).toEqual([product1.name, product2.name]);
  const rows = [...markup.matchAll(/<th[^>]*scope="row"[^>]*>([^<]+)<\/th>/g)].map(([, name]) => name);
  expect(rows).toEqual(rowNames);
});
