import { describe, expect, it, vi } from 'vitest';
import { Company } from '../entities/Company';
import type { CompanyRepository } from '../repositories/CompanyRepository';
import { CreateCompany } from '../usecases/CreateCompany';

function createMockRepository(): CompanyRepository {
  return {
    findById: vi.fn(),
    findAllWithPagination: vi.fn(),
    findByName: vi.fn(),
    insert: vi.fn(),
  };
}

describe('CreateCompany', () => {
  describe('execute', () => {
    it('회사를 생성하고 저장된 결과를 반환한다', async () => {
      const repository = createMockRepository();
      const inserted = new Company({ id: 'company-1', name: '다런', address: '서울', type: 'startup' });
      vi.mocked(repository.insert).mockResolvedValue(inserted);

      const usecase = new CreateCompany(repository as never);
      const result = await usecase.execute({ name: '다런', address: '서울', type: 'startup' });

      expect(repository.insert).toHaveBeenCalledOnce();
      expect(result).toBe(inserted);
    });

    it('insert가 null을 반환하면 에러를 던진다', async () => {
      const repository = createMockRepository();
      vi.mocked(repository.insert).mockResolvedValue(null);

      const usecase = new CreateCompany(repository as never);

      await expect(usecase.execute({ name: '다런', address: '서울', type: 'startup' })).rejects.toThrow();
    });
  });
});
