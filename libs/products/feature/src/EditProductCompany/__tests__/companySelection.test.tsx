import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProductCompany } from '../EditProductCompany';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
  useLazyQuery: vi.fn(),
  useMutation: vi.fn(),
}));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const search = vi.fn();
const save = vi.fn();
const currentCompany = { id: 'current-company', name: '현재 회사' };
const companyA = { id: 'company-a', name: '선택 회사 A' };
const companyB = { id: 'company-b', name: '검색 회사 B' };

async function searchFor(query: string) {
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText('회사 이름을 검색하세요'), {
      target: { value: query },
    });
    await vi.runOnlyPendingTimersAsync();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  vi.mocked(useQuery).mockReturnValue({
    data: { tempProductBySlug: { ownedCompany: currentCompany } },
  } as ReturnType<typeof useQuery>);
  vi.mocked(useLazyQuery).mockReturnValue([search, {}] as unknown as ReturnType<typeof useLazyQuery>);
  vi.mocked(useMutation).mockReturnValue([save, { loading: false }] as unknown as ReturnType<typeof useMutation>);
  save.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('회사 선택과 저장 대상', () => {
  it.each(['다른 결과', '빈 결과', '실패', '빈 검색어'])(
    '%s 뒤에도 선택한 회사 표시와 저장 ID가 일치한다',
    async state => {
      search.mockResolvedValueOnce({ data: { searchCompanies: [companyA] } });
      render(<EditProductCompany slug="fixture-product" />);
      await searchFor('선택');
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: companyA.id },
      });
      expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(companyA.id);

      if (state === '실패') search.mockRejectedValueOnce(new Error('fixture search failure'));
      else
        search.mockResolvedValueOnce({
          data: { searchCompanies: state === '다른 결과' ? [companyB] : [] },
        });
      await searchFor(state === '빈 검색어' ? '' : '다음 검색');

      const select = screen.getByRole<HTMLSelectElement>('combobox');
      expect(select.value).toBe(companyA.id);
      expect(select.selectedOptions[0]?.textContent).toBe(companyA.name);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      expect(save).toHaveBeenCalledExactlyOnceWith({
        variables: {
          input: { companyId: companyA.id },
          slug: 'fixture-product',
        },
      });
    }
  );

  it('현재 회사와 선택 회사가 검색 결과에 다시 나와도 ID별 option은 하나이며 명시적인 선택 해제를 저장하지 않는다', async () => {
    search.mockResolvedValueOnce({
      data: { searchCompanies: [companyA, currentCompany] },
    });
    render(<EditProductCompany slug="fixture-product" />);
    await searchFor('선택');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: companyA.id },
    });
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe(companyA.id);
    search.mockResolvedValueOnce({
      data: { searchCompanies: [companyA, currentCompany, companyB] },
    });
    await searchFor('모두');
    const select = screen.getByRole<HTMLSelectElement>('combobox');
    expect([...select.options].filter(option => option.value === companyA.id)).toHaveLength(1);
    expect([...select.options].filter(option => option.value === currentCompany.id)).toHaveLength(1);
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(select.value).toBe('');
    expect(save).not.toHaveBeenCalled();
  });
});
