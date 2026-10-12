// @vitest-environment jsdom
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from '@darun/utils-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductResearchSection } from '../features/products/ProductResearchSection';

vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
  useLazyQuery: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, part, index) => acc + part + (index < values.length ? String(values[index]) : ''), ''),
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  useNavigate: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

describe('ProductResearchSection admin re-entry UX', () => {
  const requestResearch = vi.fn();
  const retryResearch = vi.fn();
  const materialize = vi.fn();
  const fetchJob = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    vi.mocked(useMutation).mockImplementation(() => [requestResearch, { loading: false }] as never);
    vi.mocked(useQuery).mockReturnValue({ data: { categories: [] } } as never);
    vi.mocked(useLazyQuery).mockReturnValue([fetchJob, { loading: false }] as never);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows progress while pending and failure with retry when failed', async () => {
    vi.mocked(useMutation).mockImplementation(((document: unknown) => {
      const text = String(document);
      if (text.includes('RetryProductResearch')) return [retryResearch, { loading: false }] as never;
      if (text.includes('MaterializeResearchedProduct')) return [materialize, { loading: false }] as never;
      return [requestResearch, { loading: false }] as never;
    }) as never);

    requestResearch.mockResolvedValueOnce({
      data: { requestProductResearch: { id: 'job-1', officialUrl: 'https://linear.app', status: 'pending' } },
    });
    fetchJob.mockResolvedValueOnce({
      data: { productResearchJob: { id: 'job-1', status: 'pending', stage: 'searching' } },
    });

    render(<ProductResearchSection />);
    fireEvent.change(screen.getByPlaceholderText('ex) https://linear.app'), {
      target: { value: 'https://linear.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조사 요청' }));

    await waitFor(() => {
      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/단계: searching/)).toBeDefined();

    fetchJob.mockResolvedValueOnce({
      data: {
        productResearchJob: {
          id: 'job-1',
          status: 'failed',
          errorCode: 'SEARCH_UNAVAILABLE',
          errorMessage: '검색 실패',
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '결과 새로고침' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('실패 재시도')).toBeDefined();
  });

  it('prefills reviewed fields with adjacent anchors and navigates to the unpublished product', async () => {
    vi.mocked(useMutation).mockImplementation(((document: unknown) => {
      const text = String(document);
      if (text.includes('RetryProductResearch')) return [retryResearch, { loading: false }] as never;
      if (text.includes('MaterializeResearchedProduct')) return [materialize, { loading: false }] as never;
      return [requestResearch, { loading: false }] as never;
    }) as never);

    requestResearch.mockResolvedValueOnce({
      data: { requestProductResearch: { id: 'job-9', officialUrl: 'https://linear.app', status: 'pending' } },
    });
    fetchJob.mockResolvedValueOnce({
      data: {
        productResearchJob: {
          id: 'job-9',
          status: 'completed',
          result: {
            originalUrl: 'https://linear.app',
            name: { value: 'Linear', evidenceType: 'INPUT_HOST', anchors: [{ sourceId: 's1', excerpt: 'x' }] },
            suggestedSlug: 'linear',
            summary: { value: '요약', evidenceType: 'MULTIPLE_EXTERNAL', anchors: [] },
            features: [{ name: '이슈', summary: '추적', emoji: '✨', evidenceType: 'SINGLE_EXTERNAL', anchors: [] }],
            tags: ['협업'],
            warnings: [],
            sources: [
              {
                id: 's1',
                title: 'Linear 공식',
                url: 'https://linear.app',
                hostname: 'linear.app',
                relationToInput: 'INPUT_HOST_MATCH',
              },
            ],
          },
        },
      },
    });
    materialize.mockResolvedValueOnce({ data: { materializeResearchedProduct: { id: 'p-1', slug: 'linear' } } });

    render(<ProductResearchSection />);
    fireEvent.change(screen.getByPlaceholderText('ex) https://linear.app'), {
      target: { value: 'https://linear.app' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조사 요청' }));

    await waitFor(() => {
      expect(screen.getByText('검토 폼 사전 입력')).toBeDefined();
    });
    expect(screen.getByText(/이름 근거: Linear 공식/)).toBeDefined();
    expect(screen.getByPlaceholderText('https://...')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://logo.example/x.png' } });
    fireEvent.change(screen.getByPlaceholderText('카테고리 ID 입력'), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('button', { name: '미발행 상품으로 저장' }));

    await waitFor(() => {
      expect(materialize).toHaveBeenCalled();
    });
    expect(navigate).toHaveBeenCalledWith('/products/linear');
  });

  it('reopens a completed job through the job-ID lookup', async () => {
    vi.mocked(useMutation).mockImplementation(((document: unknown) => {
      const text = String(document);
      if (text.includes('RetryProductResearch')) return [retryResearch, { loading: false }] as never;
      if (text.includes('MaterializeResearchedProduct')) return [materialize, { loading: false }] as never;
      return [requestResearch, { loading: false }] as never;
    }) as never);
    fetchJob.mockResolvedValueOnce({
      data: {
        productResearchJob: {
          id: 'job-old',
          status: 'completed',
          result: {
            originalUrl: 'https://linear.app',
            name: { value: 'Linear', evidenceType: 'NONE', anchors: [] },
            suggestedSlug: 'linear',
            summary: null,
            features: [],
            tags: [],
            warnings: [],
            sources: [],
          },
        },
      },
    });

    render(<ProductResearchSection />);
    fireEvent.change(screen.getByPlaceholderText('조사 작업 ID 입력'), { target: { value: 'job-old' } });
    fireEvent.click(screen.getByRole('button', { name: '작업 열기' }));

    await waitFor(() => {
      expect(screen.getByText('작업 ID: job-old')).toBeDefined();
    });
    expect(screen.getByText('검토 폼 사전 입력')).toBeDefined();
  });
});
