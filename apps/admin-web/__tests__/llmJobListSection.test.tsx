// @vitest-environment jsdom
import { useMutation, useQuery } from '@apollo/client/react';
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
  const mockRetryMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRetryMutation.mockResolvedValue({ data: { retryTranslationJob: { id: 'job-1', status: 'pending' } } });
    vi.mocked(useMutation).mockReturnValue([mockRetryMutation, { loading: false }] as unknown as ReturnType<
      typeof useMutation
    >);
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
      data: { translationJobs: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);
    expect(screen.getByText('등록된 LLM 작업이 없습니다.')).toBeDefined();
  });

  it('작업 목록을 올바르게 렌더링한다 (성공, 진행중, 실패)', () => {
    const mockJobs = [
      {
        id: 'job-11111111',
        entityType: 'Product',
        entityId: 'prod-aaa',
        locale: 'en',
        status: 'completed',
        message: '번역 완료',
        error: null,
        createdAt: '2026-09-17T06:00:00.000Z',
        updatedAt: '2026-09-17T06:00:15.000Z',
      },
      {
        id: 'job-22222222',
        entityType: 'Product',
        entityId: 'prod-bbb',
        locale: 'en',
        status: 'in_progress',
        message: 'OpenRouter 번역 중...',
        error: null,
        createdAt: '2026-09-17T06:05:00.000Z',
        updatedAt: '2026-09-17T06:05:10.000Z',
      },
      {
        id: 'job-33333333',
        entityType: 'Product',
        entityId: 'prod-ccc',
        locale: 'en',
        status: 'failed',
        message: 'LLM 번역 중 에러 발생',
        error: 'OpenRouter 429 RateLimitError: rate-limited',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockReturnValue({
      data: { translationJobs: mockJobs },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);

    // Status badges (filter button + table row badge)
    expect(screen.getAllByText('완료').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('진행 중').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('실패').length).toBeGreaterThanOrEqual(2);

    // Entity IDs
    expect(screen.getByText('prod-aaa')).toBeDefined();
    expect(screen.getByText('prod-bbb')).toBeDefined();
    expect(screen.getByText('prod-ccc')).toBeDefined();

    // Error message display
    expect(screen.getByText('OpenRouter 429 RateLimitError: rate-limited')).toBeDefined();

    // Retry button for failed job
    expect(screen.getByRole('button', { name: /재시도/i })).toBeDefined();
  });

  it('실패한 작업의 재시도 버튼 클릭 시 mutation을 실행한다', async () => {
    const refetch = vi.fn();
    const mockJobs = [
      {
        id: 'job-failed-1',
        entityType: 'Product',
        entityId: 'prod-xxx',
        locale: 'en',
        status: 'failed',
        message: '번역 에러',
        error: '429 RateLimitError',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockReturnValue({
      data: { translationJobs: mockJobs },
      loading: false,
      error: undefined,
      refetch,
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);

    const retryButton = screen.getByRole('button', { name: /재시도/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetryMutation).toHaveBeenCalledWith({
        variables: { id: 'job-failed-1' },
      });
      expect(refetch).toHaveBeenCalled();
    });
  });

  it('에러 클릭 시 모달이 열리고 모달 내에서 재시도를 실행할 수 있다', async () => {
    const refetch = vi.fn();
    const mockJobs = [
      {
        id: 'job-failed-modal',
        entityType: 'Product',
        entityId: 'prod-modal',
        locale: 'en',
        status: 'failed',
        message: '치명적 번역 실패',
        error: 'OpenRouter upstream error: connection refused',
        createdAt: '2026-09-17T06:10:00.000Z',
        updatedAt: '2026-09-17T06:10:05.000Z',
      },
    ];

    vi.mocked(useQuery).mockReturnValue({
      data: { translationJobs: mockJobs },
      loading: false,
      error: undefined,
      refetch,
    } as unknown as ReturnType<typeof useQuery>);

    render(<LlmJobListSection />);

    // Click on error text to open modal
    const errorElement = screen.getByText('OpenRouter upstream error: connection refused');
    fireEvent.click(errorElement);

    // Modal opened
    expect(screen.getByTestId('admin-modal')).toBeDefined();
    expect(screen.getByText('LLM 작업 에러 상세')).toBeDefined();
    expect(screen.getByText('지금 재시도')).toBeDefined();

    // Click retry inside modal
    fireEvent.click(screen.getByText('지금 재시도'));

    await waitFor(() => {
      expect(mockRetryMutation).toHaveBeenCalledWith({
        variables: { id: 'job-failed-modal' },
      });
    });
  });
});
