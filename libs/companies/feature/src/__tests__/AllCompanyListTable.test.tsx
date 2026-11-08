// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { AllCompanyListTable } from '../AllCompanyListTable/AllCompanyListTable';

afterEach(() => vi.unstubAllEnvs());

it.each(['UTC', 'Asia/Seoul', 'America/Los_Angeles'])(
  '%s 관리자 목록에 개업일의 UTC 날짜와 미입력 상태를 표시한다',
  timeZone => {
    vi.stubEnv('TZ', timeZone);
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: ApolloLink.empty(),
    });
    client.cache.writeQuery({
      query: AllCompaniesOnAllCompanyListTableDocument,
      variables: { page: 1 },
      data: {
        allCompanies: {
          totalCount: 4,
          totalPages: 1,
          companies: ['2026-01-01T00:00:00.000Z', '2024-02-29T00:00:00.000Z', '2025-12-31T23:30:00.000Z', null].map(
            (startAt, index) => ({
              id: `company-${index}`,
              name: `회사 ${index}`,
              type: '법인',
              address: '서울',
              startAt,
            })
          ),
        },
      },
    });
    try {
      const host = document.createElement('div');
      host.innerHTML = renderToStaticMarkup(
        <ApolloProvider client={client}>
          <AllCompanyListTable />
        </ApolloProvider>
      );
      expect(Array.from(host.querySelectorAll('tbody tr'), row => row.lastElementChild?.textContent)).toEqual([
        '2026. 01. 01.',
        '2024. 02. 29.',
        '2025. 12. 31.',
        '-',
      ]);
    } finally {
      client.stop();
    }
  }
);
