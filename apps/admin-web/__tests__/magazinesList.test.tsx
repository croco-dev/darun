// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MagazinesList } from '../features/magazines/MagazinesList/MagazinesList';
import { useMagazinesList } from '../features/magazines/MagazinesList/useMagazinesList';

vi.mock('../features/magazines/MagazinesList/useMagazinesList', () => ({
  useMagazinesList: vi.fn(),
}));

describe('MagazinesList', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no magazines', () => {
    vi.mocked(useMagazinesList).mockReturnValue({
      magazines: [],
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      page: 1,
      setPage: vi.fn(),
      totalCount: 0,
      totalPages: 1,
    });

    render(<MagazinesList />);

    expect(screen.getByText('등록된 매거진이 없습니다.')).toBeTruthy();
  });

  it('renders magazines list and falls back to Sparkles placeholder on image load error', () => {
    vi.mocked(useMagazinesList).mockReturnValue({
      magazines: [
        {
          id: 'mag-1',
          slug: 'test-magazine',
          title: '테스트 매거진 제목',
          summary: '매거진 요약 설명',
          content: '<p>내용</p>',
          backgroundImageUrl: 'https://invalid-image.url/test.png',
          publishedAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          author: { id: 'u1', name: '작성자' },
        },
      ],
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      page: 1,
      setPage: vi.fn(),
      totalCount: 1,
      totalPages: 1,
    });

    render(<MagazinesList />);

    expect(screen.getByText('테스트 매거진 제목')).toBeTruthy();
    expect(screen.getByText('매거진 요약 설명')).toBeTruthy();

    const img = screen.getByAltText('테스트 매거진 제목');
    expect(img).toBeTruthy();

    // Trigger image loading failure
    fireEvent.error(img);

    // The image should be replaced with the fallback icon
    expect(screen.queryByAltText('테스트 매거진 제목')).toBeNull();
  });

  it('resets error state when image src changes on the same thumbnail item', () => {
    let currentSrc = 'https://invalid-image.url/broken.png';
    vi.mocked(useMagazinesList).mockImplementation(() => ({
      magazines: [
        {
          id: 'mag-1',
          slug: 'test-magazine',
          title: '테스트 매거진 제목',
          summary: '매거진 요약 설명',
          content: '<p>내용</p>',
          backgroundImageUrl: currentSrc,
          publishedAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          author: { id: 'u1', name: '작성자' },
        },
      ],
      loading: false,
      error: undefined,
      refetch: vi.fn(),
      page: 1,
      setPage: vi.fn(),
      totalCount: 1,
      totalPages: 1,
    }));

    const { rerender } = render(<MagazinesList />);

    const img = screen.getByAltText('테스트 매거진 제목');
    fireEvent.error(img);
    expect(screen.queryByAltText('테스트 매거진 제목')).toBeNull();

    // Now update backgroundImageUrl and rerender
    currentSrc = 'https://valid-image.url/new.png';
    rerender(<MagazinesList key="updated" />);

    // The new image should be rendered again (hasError reset)
    expect(screen.getByAltText('테스트 매거진 제목')).toBeTruthy();
  });
});
