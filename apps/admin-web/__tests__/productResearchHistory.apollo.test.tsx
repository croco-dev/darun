// @vitest-environment jsdom
import { MockedProvider } from '@apollo/client/testing/react';
import { AdminProductResearchJobsDocument } from '@darun/provider-graphql';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import ProductResearchHistoryPage from '../app/products/new/research/page';

vi.mock('@darun/utils-router', () => ({
  Link: (props: ComponentProps<'a'>) => <a {...props} />,
}));

afterEach(cleanup);

it('빈 브라우저에서 다음 이력 페이지를 재시도하고 기존 상세 링크를 표시한다', async () => {
  localStorage.clear();
  sessionStorage.clear();
  const createdAt = '2026-11-25T00:17:00.000Z';
  const latest = {
    __typename: 'AdminProductResearchJobSummary',
    id: 'new-job',
    officialUrl: 'https://example.test/new',
    status: 'in_progress',
    createdAt,
  };
  const older = {
    ...latest,
    id: 'older + job',
    officialUrl: 'https://example.test/older',
    status: 'failed',
  };
  const firstRequest = { query: AdminProductResearchJobsDocument, variables: { after: null } };
  const olderRequest = { query: AdminProductResearchJobsDocument, variables: { after: 'next-page' } };
  const first = {
    request: firstRequest,
    result: {
      data: {
        adminProductResearchJobs: {
          __typename: 'AdminProductResearchJobPage',
          jobs: [latest],
          nextCursor: 'next-page',
        },
      },
    },
  };
  render(
    <MockedProvider
      mocks={[
        first,
        { request: olderRequest, error: new Error('Fixture page read failed') },
        {
          request: olderRequest,
          result: {
            data: {
              adminProductResearchJobs: { __typename: 'AdminProductResearchJobPage', jobs: [older], nextCursor: null },
            },
          },
        },
        first,
      ]}
    >
      <ProductResearchHistoryPage />
    </MockedProvider>
  );

  expect(await screen.findByRole('link', { name: /example\.test\/new\s*진행 중/ })).toBeDefined();
  const next = screen.getByRole('button', { name: '다음 페이지' });
  next.focus();
  fireEvent.click(next);
  const retry = await screen.findByRole('button', { name: '다시 조회' });
  expect(screen.getByRole('status').textContent).toBe('조사 이력을 불러오지 못했습니다.');
  expect(document.activeElement).toBe(next);
  fireEvent.click(retry);

  const olderLink = await screen.findByRole('link', { name: /example\.test\/older\s*실패/ });
  expect(olderLink.getAttribute('href')).toBe('/products/new?researchJobId=older%20%2B%20job');
  expect(next.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '이전 페이지' }));
  expect(await screen.findByRole('link', { name: /example\.test\/new\s*진행 중/ })).toBeDefined();
});
