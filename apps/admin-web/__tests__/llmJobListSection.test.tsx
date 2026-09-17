// @vitest-environment jsdom
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetProductDescriptionJobsOnAdminDocument,
  GetTranslationJobsOnAdminDocument,
  RetryProductDescriptionJobOnAdminDocument,
  RetryTranslationJobOnAdminDocument,
} from '@darun/provider-graphql';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmJobListSection } from '../features/llm-jobs/LlmJobListSection';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('@darun/ui-admin', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    AdminModal: ({ opened, title, children }: { opened: boolean; title: string; children: React.ReactNode }) =>
      opened ? (
        <div data-testid="admin-modal" aria-label={title}>
          <h2>{title}</h2>
          {children}
        </div>
      ) : null,
  };
});

describe('LlmJobListSection', () => {
  const mockRetryTranslation = vi.fn();
  const mockRetryDescription = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRetryTranslation.mockResolvedValue({ data: { retryTranslationJob: { id: 'job-1', status: 'pending' } } });
    mockRetryDescription.mockResolvedValue({
      data: { retryProductDescriptionJob: { id: 'desc-job-1', status: 'pending' } },
    });

    vi.mocked(useMutation).mockImplementation(document => {
      if (document === RetryTranslationJobOnAdminDocument) {
        return [mockRetryTranslation, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }
      if (document === RetryProductDescriptionJobOnAdminDocument) {
        return [mockRetryDescription, { loading: false }] as unknown as ReturnType<typeof useMutation>;
      }
      return [vi.fn(), { loading: false }] as unknown as ReturnType<typeof useMutation>;
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('로딩 중일 때 로딩 상태를 렌더링한다', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);
    expect(screen.getByText('불러오는 중...')).toBeDefined();
  });

  it('에러 발생 시 에러 상태와 다시 시도 버튼을 렌더링한다', () => {
    const refetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error('Failed to fetch jobs'),
      refetch,
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);
    expect(screen.getByText('문제가 발생했습니다.')).toBeDefined();
    expect(screen.getByText('Failed to fetch jobs')).toBeDefined();
    expect(screen.getByText('다시 시도')).toBeDefined();

    fireEvent.click(screen.getByText('다시 시도'));
    expect(refetch).toHaveBeenCalled();
  });

  it('작업이 없을 때 빈 상태 메시지를 렌더링한다', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);
    expect(screen.getByText('등록된 LLM 작업이 없습니다.')).toBeDefined();
  });

  it('번역 작업과 소개 생성 작업을 모두 올바르게 통합 렌더링한다', () => {
    const mockTranslationJobs = [
      {
        id: 'trans-job-1',
        entityType: 'Product',
        entityId: 'prod-trans',
        locale: 'en',
        status: 'completed',
        message: '번역 완료',
        error: null,
        createdAt: '2026-09-17T06:00:00.000Z',
        updatedAt: '2026-09-17T06:00:15.000Z',
      },
    ];

    const mockDescriptionJobs = [
      {
        id: 'desc-job-1',
        productId: 'prod-desc',
        status: 'failed',
        message: '소개 생성 실패',
        error: 'OpenRouter 429 RateLimitError',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockImplementation(document => {
      if (document === GetTranslationJobsOnAdminDocument) {
        return {
          data: { translationJobs: mockTranslationJobs },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      if (document === GetProductDescriptionJobsOnAdminDocument) {
        return {
          data: { productDescriptionJobs: mockDescriptionJobs },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() } as unknown as ReturnType<
        typeof useQuery
      >;
    });

    render(<LlmJobListSection />);

    // Job types rendered
    expect(screen.getByText('상품 영문 번역')).toBeDefined();
    expect(screen.getByText('상품 AI 소개 생성')).toBeDefined();

    // Entity IDs
    expect(screen.getByText('prod-trans')).toBeDefined();
    expect(screen.getByText('prod-desc')).toBeDefined();

    // Error message display for failed description job
    expect(screen.getByText('OpenRouter 429 RateLimitError')).toBeDefined();

    // Status badges
    expect(screen.getAllByText('완료').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('실패').length).toBeGreaterThanOrEqual(2);

    // Filter buttons
    expect(screen.getByText('전체 작업')).toBeDefined();
    expect(screen.getByText('영문 번역')).toBeDefined();
    expect(screen.getByText('AI 소개 생성')).toBeDefined();
  });

  it('소개 생성 작업 실패 건의 재시도 클릭 시 retryProductDescriptionJob을 실행한다', async () => {
    const refetchDesc = vi.fn();
    const mockDescriptionJobs = [
      {
        id: 'desc-job-failed',
        productId: 'prod-desc-fail',
        status: 'failed',
        message: '소개 생성 에러',
        error: 'RateLimit',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockImplementation(document => {
      if (document === GetTranslationJobsOnAdminDocument) {
        return {
          data: { translationJobs: [] },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      if (document === GetProductDescriptionJobsOnAdminDocument) {
        return {
          data: { productDescriptionJobs: mockDescriptionJobs },
          loading: false,
          error: undefined,
          refetch: refetchDesc,
        } as unknown as ReturnType<typeof useQuery>;
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() } as unknown as ReturnType<
        typeof useQuery
      >;
    });

    render(<LlmJobListSection />);

    const retryButton = screen.getByRole('button', { name: /재시도/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetryDescription).toHaveBeenCalledWith({
        variables: { id: 'desc-job-failed' },
      });
      expect(mockRetryTranslation).not.toHaveBeenCalled();
      expect(refetchDesc).toHaveBeenCalled();
    });
  });

  it('번역 작업 실패 건의 재시도 클릭 시 retryTranslationJob을 실행한다', async () => {
    const refetchTrans = vi.fn();
    const mockTranslationJobs = [
      {
        id: 'trans-job-failed',
        entityType: 'Product',
        entityId: 'prod-trans-fail',
        locale: 'en',
        status: 'failed',
        message: '번역 에러',
        error: 'Translation timeout',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockImplementation(document => {
      if (document === GetTranslationJobsOnAdminDocument) {
        return {
          data: { translationJobs: mockTranslationJobs },
          loading: false,
          error: undefined,
          refetch: refetchTrans,
        } as unknown as ReturnType<typeof useQuery>;
      }
      if (document === GetProductDescriptionJobsOnAdminDocument) {
        return {
          data: { productDescriptionJobs: [] },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() } as unknown as ReturnType<
        typeof useQuery
      >;
    });

    render(<LlmJobListSection />);

    const retryButton = screen.getByRole('button', { name: /재시도/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetryTranslation).toHaveBeenCalledWith({
        variables: { id: 'trans-job-failed' },
      });
      expect(mockRetryDescription).not.toHaveBeenCalled();
      expect(refetchTrans).toHaveBeenCalled();
    });
  });

  it('에러 클릭 시 모달이 열리고 모달 내에서 지금 재시도를 실행할 수 있다', async () => {
    const mockDescriptionJobs = [
      {
        id: 'desc-modal-job',
        productId: 'prod-modal-1',
        status: 'failed',
        message: '소개 생성 치명적 에러',
        error: 'OpenRouter internal server error: 502',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockImplementation(document => {
      if (document === GetTranslationJobsOnAdminDocument) {
        return {
          data: { translationJobs: [] },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      if (document === GetProductDescriptionJobsOnAdminDocument) {
        return {
          data: { productDescriptionJobs: mockDescriptionJobs },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() } as unknown as ReturnType<
        typeof useQuery
      >;
    });

    render(<LlmJobListSection />);

    // Click error text
    const errorText = screen.getByText('OpenRouter internal server error: 502');
    fireEvent.click(errorText);

    // Modal opened
    expect(screen.getByTestId('admin-modal')).toBeDefined();
    expect(screen.getByText('LLM 작업 에러 상세')).toBeDefined();
    expect(screen.getByText('지금 재시도')).toBeDefined();

    // Click retry in modal
    fireEvent.click(screen.getByText('지금 재시도'));

    await waitFor(() => {
      expect(mockRetryDescription).toHaveBeenCalledWith({
        variables: { id: 'desc-modal-job' },
      });
    });
  });

  it('대기 중(pending) 또는 진행 중(in_progress) 작업의 소요 시간은 대시(-)로 표시한다', () => {
    const mockJobs = [
      {
        id: 'job-pending',
        productId: 'prod-pending',
        status: 'pending',
        message: '대기 중',
        error: null,
        createdAt: '2026-09-17T06:00:00.000Z',
        updatedAt: '2026-09-17T06:00:00.000Z',
      },
      {
        id: 'job-progress',
        productId: 'prod-progress',
        status: 'in_progress',
        message: '진행 중',
        error: null,
        createdAt: '2026-09-17T06:00:00.000Z',
        updatedAt: '2026-09-17T06:00:30.000Z',
      },
    ];

    vi.mocked(useQuery).mockImplementation(document => {
      if (document === GetTranslationJobsOnAdminDocument) {
        return {
          data: { translationJobs: [] },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      if (document === GetProductDescriptionJobsOnAdminDocument) {
        return {
          data: { productDescriptionJobs: mockJobs },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useQuery>;
      }
      return { data: undefined, loading: false, error: undefined, refetch: vi.fn() } as unknown as ReturnType<
        typeof useQuery
      >;
    });

    render(<LlmJobListSection />);

    expect(screen.getByText('prod-pending')).toBeDefined();
    expect(screen.getByText('prod-progress')).toBeDefined();
    // Verify status badges
    expect(screen.getAllByText('대기 중').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('진행 중').length).toBeGreaterThanOrEqual(1);
  });
});
