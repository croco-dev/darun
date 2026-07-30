import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createElement, memo } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditProductCompany } from '../EditProductCompany';
import { useEditProductCompany } from '../useEditProductCompany';

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

vi.mock('../useEditProductCompany', () => ({
  useEditProductCompany: vi.fn(),
}));

const mockHandleSearchChange = vi.fn();

const mockForm = {
  onSubmit: vi.fn((handler: Function) => handler),
  getValues: vi.fn(() => ({ companyId: '' })),
  setFieldValue: vi.fn(),
};

const defaultHookReturn = {
  form: mockForm,
  handleSubmit: vi.fn(),
  companies: [] as { label: string; value: string }[],
  searchValue: '',
  handleSearchChange: mockHandleSearchChange,
};

describe('EditProductCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditProductCompany).mockReturnValue(
      defaultHookReturn as unknown as ReturnType<typeof useEditProductCompany>
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('should render search input for company name', () => {
    render(<EditProductCompany slug="test-slug" />);

    const searchInput = screen.queryByPlaceholderText('회사 이름을 검색하세요');
    expect(searchInput).toBeTruthy();
  });

  it('should call handleSearchChange when search input value changes', () => {
    render(<EditProductCompany slug="test-slug" />);

    const searchInput = screen.getByPlaceholderText<HTMLInputElement>('회사 이름을 검색하세요');
    fireEvent.change(searchInput, { target: { value: '토스' } });
    expect(mockHandleSearchChange).toHaveBeenCalledWith('토스');
  });

  it('should render companies as select options', () => {
    vi.mocked(useEditProductCompany).mockReturnValue({
      ...defaultHookReturn,
      companies: [
        { label: '토스', value: '1' },
        { label: '카카오', value: '2' },
      ],
    } as unknown as ReturnType<typeof useEditProductCompany>);

    render(<EditProductCompany slug="test-slug" />);

    expect(screen.getByText('토스')).toBeTruthy();
    expect(screen.getByText('카카오')).toBeTruthy();
  });

  it('should render save button', () => {
    render(<EditProductCompany slug="test-slug" />);

    expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
  });
});
