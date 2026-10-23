import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProductCompany } from '../EditProductCompany';

vi.mock('@apollo/client/react', () => ({ useLazyQuery: vi.fn(), useMutation: vi.fn(), useQuery: vi.fn() }));
vi.mock('@darun/utils-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

const search = vi.fn();
const save = vi.fn();
const companyA = { id: 'company-a', name: '회사 A' };
const companyB = { id: 'company-b', name: '회사 B' };

async function searchFor(query: string) {
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText('회사 이름을 검색하세요'), { target: { value: query } });
    await vi.advanceTimersByTimeAsync(500);
  });
}

function selectCompany(id: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: id } });
}

function expectSelected(id: string, label: string) {
  const select = screen.getByRole<HTMLSelectElement>('combobox');
  expect(select.value).toBe(id);
  expect(select.selectedOptions[0].textContent).toBe(label);
}

describe('company selection with the real Mantine form and native select', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    search.mockReset();
    save.mockReset();
    vi.mocked(useQuery).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useLazyQuery).mockReturnValue([search, {}] as unknown as ReturnType<typeof useLazyQuery>);
    vi.mocked(useMutation).mockReturnValue([save, { loading: false }] as unknown as ReturnType<typeof useMutation>);
    save.mockResolvedValue({ data: {} });
    search.mockResolvedValue({ data: { searchCompanies: [companyA] } });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(['other results', 'empty results', 'failed search', 'blank query'])(
    'keeps the selected company visible and submits it after %s',
    async nextSearch => {
      render(<EditProductCompany slug="fixture-product" />);
      await searchFor('A');
      selectCompany(companyA.id);
      expectSelected(companyA.id, companyA.name);

      if (nextSearch === 'failed search') search.mockRejectedValueOnce(new Error('Fixture search failure'));
      else
        search.mockResolvedValueOnce({ data: { searchCompanies: nextSearch === 'other results' ? [companyB] : [] } });
      await searchFor(nextSearch === 'blank query' ? '' : 'B');

      expectSelected(companyA.id, companyA.name);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
      expect(save).toHaveBeenCalledExactlyOnceWith({
        variables: { input: { companyId: companyA.id }, slug: 'fixture-product' },
      });
    }
  );

  it('deduplicates the connected and selected companies and submits a newly selected result', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { tempProductBySlug: { ownedCompany: companyA } },
    } as unknown as ReturnType<typeof useQuery>);
    search.mockResolvedValueOnce({ data: { searchCompanies: [companyA, companyB] } });
    render(<EditProductCompany slug="fixture-product" />);
    expectSelected(companyA.id, '회사 A (현재 연결됨)');
    await searchFor('회사');
    selectCompany(companyB.id);
    search.mockResolvedValueOnce({ data: { searchCompanies: [companyA, companyB] } });
    await searchFor('회사 B');

    const options = Array.from(screen.getByRole<HTMLSelectElement>('combobox').options);
    expect(options.filter(option => option.value === companyA.id)).toHaveLength(1);
    expect(options.filter(option => option.value === companyB.id)).toHaveLength(1);
    expectSelected(companyB.id, companyB.name);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(save).toHaveBeenCalledExactlyOnceWith({
      variables: { input: { companyId: companyB.id }, slug: 'fixture-product' },
    });
  });

  it('does not submit a hidden previous ID when the user returns to the placeholder', async () => {
    render(<EditProductCompany slug="fixture-product" />);
    await searchFor('A');
    selectCompany(companyA.id);
    selectCompany('');
    expectSelected('', '선택하세요');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(save).not.toHaveBeenCalled();
  });
});
