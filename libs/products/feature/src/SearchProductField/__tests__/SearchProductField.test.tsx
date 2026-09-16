import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createElement, memo } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchProductField } from '../SearchProductField';
import { useSearchProductField } from '../useSearchProductField';

vi.mock('@darun/utils-structure-react', () => ({
  bind: vi.fn(
    (
      useHook: (props: Record<string, unknown>) => Record<string, unknown>,
      View: React.ComponentType<Record<string, unknown>>
    ) => {
      const ViewComponent = memo(View);
      const Bound = memo((props: Record<string, unknown>) => createElement(ViewComponent, useHook(props)));
      return Object.assign(Bound, { ViewComponent });
    }
  ),
}));

vi.mock('../useSearchProductField', () => ({
  useSearchProductField: vi.fn(),
}));

const mockSearchProduct = vi.fn();
const mockSelectProduct = vi.fn();

const defaultHookReturn = {
  products: [
    { label: '토스', value: 'prod-toss-id' },
    { label: '카카오페이', value: 'prod-kakaopay-id' },
  ],
  searchProduct: mockSearchProduct,
  selectProduct: mockSelectProduct,
};

describe('SearchProductField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchProductField).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useSearchProductField>
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('renders search input and datalist with options', () => {
    render(<SearchProductField onSelect={vi.fn()} />);

    const input = screen.getByPlaceholderText('서비스 이름을 검색하세요.');
    expect(input).toBeTruthy();

    const datalistId = input.getAttribute('list');
    expect(datalistId).toBeTruthy();

    const options = document.querySelectorAll('datalist option');
    expect(options.length).toBe(2);
    expect(options[0]?.getAttribute('value')).toBe('토스');
    expect(options[1]?.getAttribute('value')).toBe('카카오페이');
  });

  it('calls searchProduct and selectProduct with matched ID when option is chosen', () => {
    render(<SearchProductField onSelect={vi.fn()} />);

    const input = screen.getByPlaceholderText('서비스 이름을 검색하세요.');
    fireEvent.change(input, { target: { value: '토스' } });

    expect(mockSearchProduct).toHaveBeenCalledWith('토스');
    expect(mockSelectProduct).toHaveBeenCalledWith('prod-toss-id');
  });

  it('calls selectProduct with null when typed text does not match any product', () => {
    render(<SearchProductField onSelect={vi.fn()} />);

    const input = screen.getByPlaceholderText('서비스 이름을 검색하세요.');
    fireEvent.change(input, { target: { value: '미등록서비스' } });

    expect(mockSearchProduct).toHaveBeenCalledWith('미등록서비스');
    expect(mockSelectProduct).toHaveBeenCalledWith(null);
  });
});
