import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Company } from '../entities/Company';
import type { CompanyRepository } from '../repositories/CompanyRepository';
import { SearchCompany } from '../usecases/SearchCompany';

const createRepository = (): CompanyRepository => ({
  findById: vi.fn(),
  findAllWithPagination: vi.fn(),
  findByName: vi.fn().mockResolvedValue([]),
  insert: vi.fn(),
});

describe('SearchCompany', () => {
  it('검색어 양끝 공백만 제거하고 기본 20개를 요청한다', async () => {
    const repository = createRepository();
    const company = new Company({ id: 'company-1', name: '다런  스튜디오', address: '서울', type: 'startup' });
    vi.mocked(repository.findByName).mockResolvedValue([company]);

    expect(await new SearchCompany(repository).execute({ query: '  다런  스튜디오  ' })).toEqual([company]);
    expect(repository.findByName).toHaveBeenCalledWith('다런  스튜디오', 20);
  });

  it.each(['', ' \t\n '])('빈 검색어 %j는 저장소를 호출하지 않는다', async query => {
    const repository = createRepository();
    expect(await new SearchCompany(repository).execute({ query })).toEqual([]);
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('100자까지 허용하고 초과한 입력은 저장소 실행 전에 거절한다', async () => {
    const repository = createRepository();
    const search = new SearchCompany(repository);
    await search.execute({ query: '  ' + '가'.repeat(100) + '  ' });
    expect(repository.findByName).toHaveBeenCalledWith('가'.repeat(100), 20);
    vi.mocked(repository.findByName).mockClear();
    await expect(search.execute({ query: '가'.repeat(101) })).rejects.toThrow('company/invalid-search-args');
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('보조 평면 문자도 DB 컬럼과 같은 문자 수로 센다', async () => {
    const repository = createRepository();
    const search = new SearchCompany(repository);
    await search.execute({ query: '🚀'.repeat(100) });
    expect(repository.findByName).toHaveBeenCalledWith('🚀'.repeat(100), 20);
    await expect(search.execute({ query: '🚀'.repeat(101) })).rejects.toThrow('company/invalid-search-args');
  });

  it.each([1, 50])('명시한 first=%i를 저장소에 전달한다', async first => {
    const repository = createRepository();
    await new SearchCompany(repository).execute({ query: '다런', first });
    expect(repository.findByName).toHaveBeenCalledWith('다런', first);
  });

  it('null first는 기본 20개로 조회한다', async () => {
    const repository = createRepository();
    await new SearchCompany(repository).execute({ query: '다런', first: null });
    expect(repository.findByName).toHaveBeenCalledWith('다런', 20);
  });

  it.each([0, -1, 51, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    '잘못된 first=%s는 빈 검색어에서도 저장소 실행 전에 거절한다',
    async first => {
      const repository = createRepository();
      const search = new SearchCompany(repository);
      await expect(search.execute({ query: '다런', first })).rejects.toThrow('company/invalid-search-args');
      await expect(search.execute({ query: ' ', first })).rejects.toThrow('company/invalid-search-args');
      expect(repository.findByName).not.toHaveBeenCalled();
    }
  );

  it('저장소 장애는 빈 검색 결과로 바꾸지 않는다', async () => {
    const repository = createRepository();
    const error = new Error('read failed');
    vi.mocked(repository.findByName).mockRejectedValue(error);
    await expect(new SearchCompany(repository).execute({ query: '다런' })).rejects.toBe(error);
  });
});
