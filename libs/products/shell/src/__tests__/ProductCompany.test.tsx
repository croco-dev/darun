import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ProductBySlugOnProductCompanyDocument } from '@darun/provider-graphql';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductCompany } from '../components/ProductCompany/ProductCompany';

const originalTimeZone = process.env.TZ;
afterEach(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

describe.each(['UTC', 'Asia/Seoul', 'America/Los_Angeles'])('%s 회사 개업일 표시', timeZone => {
  beforeEach(() => {
    process.env.TZ = timeZone;
  });
  it.each([
    ['2026-01-01T00:00:00.000Z', '2026. 01. 01.', 'Jan 1, 2026'],
    ['2024-02-29T00:00:00.000Z', '2024. 02. 29.', 'Feb 29, 2024'],
    ['2025-12-31T23:30:00.000Z', '2025. 12. 31.', 'Dec 31, 2025'],
  ])('%s의 UTC 달력 날짜를 한영 회사 정보에 유지한다', (startAt, ko, en) => {
    for (const locale of ['ko', 'en']) {
      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.empty(),
      });
      client.cache.writeQuery({
        query: ProductBySlugOnProductCompanyDocument,
        variables: { slug: 'calendar-company', locale },
        data: {
          productBySlug: {
            id: 'product-1',
            ownedCompany: {
              id: 'company-1',
              name: 'Calendar Company',
              type: '',
              address: '',
              startAt,
            },
          },
        },
      });
      try {
        const html = renderToStaticMarkup(
          <ApolloProvider client={client}>
            <NextIntlClientProvider
              locale={locale}
              timeZone="UTC"
              messages={{
                ProductDetail: {
                  company: {
                    basicInfo: 'Company',
                    field: { name: 'Name', foundedAt: 'Founded' },
                  },
                },
              }}
            >
              <ProductCompany slug="calendar-company" />
            </NextIntlClientProvider>
          </ApolloProvider>
        );
        const host = document.createElement('div');
        host.innerHTML = html;
        expect(host.querySelector('time')?.textContent).toBe(locale === 'ko' ? ko : en);
        expect(host.querySelector('time')?.dateTime).toBe(startAt);
      } finally {
        client.stop();
      }
    }
  });
});
