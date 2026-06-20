import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductDetailViewTracker } from '../ProductDetailViewTracker';

const mockUseSearchParams = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useSearchParams: mockUseSearchParams,
}));

vi.mock('../posthog', () => ({
  track: mockTrack,
}));

function createMockSearchParams(params: Record<string, string>): URLSearchParams {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => sp.set(key, value));
  return sp;
}

describe('ProductDetailViewTracker', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockUseSearchParams.mockReset();
  });

  it('emits PRODUCT_DETAIL_VIEWED with source=search when from=search', () => {
    mockUseSearchParams.mockReturnValue(createMockSearchParams({ from: 'search' }));
    render(<ProductDetailViewTracker productSlug="test-product" />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('product_detail_viewed', {
      productSlug: 'test-product',
      source: 'search',
    });
  });

  it('emits PRODUCT_DETAIL_VIEWED with source=trending when from=trending', () => {
    mockUseSearchParams.mockReturnValue(createMockSearchParams({ from: 'trending' }));
    render(<ProductDetailViewTracker productSlug="test-product" />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('product_detail_viewed', {
      productSlug: 'test-product',
      source: 'trending',
    });
  });

  it('emits PRODUCT_DETAIL_VIEWED with source=direct when no from param', () => {
    mockUseSearchParams.mockReturnValue(createMockSearchParams({}));
    render(<ProductDetailViewTracker productSlug="test-product" />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('product_detail_viewed', {
      productSlug: 'test-product',
      source: 'direct',
    });
  });

  it('emits PRODUCT_DETAIL_VIEWED with source=direct when from is invalid', () => {
    mockUseSearchParams.mockReturnValue(createMockSearchParams({ from: 'invalid' }));
    render(<ProductDetailViewTracker productSlug="test-product" />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('product_detail_viewed', {
      productSlug: 'test-product',
      source: 'direct',
    });
  });

  it('emits exactly one event per mount for the same slug/source pair', () => {
    mockUseSearchParams.mockReturnValue(createMockSearchParams({ from: 'search' }));
    render(<ProductDetailViewTracker productSlug="test-product" />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
