import { mockedMethods } from '@darun/utils-vitest-config/testing';
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
  describe.each([
    ['name', 100],
    ['type', 20],
    ['address', 200],
  ] as const)('%s 저장 길이', (field, limit) => {
    it.each(['한', '🚀'])('상한+1의 %s 입력은 repository 전에 거절한다', async character => {
      const repository = createMockRepository();
      mockedMethods(repository).insert.mockImplementation(async company => company);
      const usecase = new CreateCompany(repository);
      await expect(
        usecase.execute({ name: '다런', type: '법인', address: '서울', [field]: character.repeat(limit + 1) })
      ).rejects.toMatchObject({ code: 'company/invalid-args' });
      expect(mockedMethods(repository).insert).not.toHaveBeenCalled();
    });

    it.each(['한', '🚀'])('상한의 %s 입력은 자르지 않고 저장한다', async character => {
      const repository = createMockRepository();
      mockedMethods(repository).insert.mockImplementation(async company => company);
      const input = { name: '다런', type: '법인', address: '서울', [field]: character.repeat(limit) };
      const result = await new CreateCompany(repository).execute(input);
      expect(result[field]).toBe(input[field]);
      expect(mockedMethods(repository).insert).toHaveBeenCalledOnce();
    });
  });

  describe('execute', () => {
    it('회사를 생성하고 저장된 결과를 반환한다', async () => {
      const repository = createMockRepository();
      const inserted = new Company({ id: 'company-1', name: '다런', address: '서울', type: 'startup' });
      mockedMethods(repository).insert.mockResolvedValue(inserted);

      const usecase = new CreateCompany(repository as never);
      const result = await usecase.execute({ name: '다런', address: '서울', type: 'startup' });

      expect(mockedMethods(repository).insert).toHaveBeenCalledOnce();
      expect(result).toBe(inserted);
    });

    it('insert가 null을 반환하면 에러를 던진다', async () => {
      const repository = createMockRepository();
      mockedMethods(repository).insert.mockResolvedValue(null);

      const usecase = new CreateCompany(repository as never);

      await expect(usecase.execute({ name: '다런', address: '서울', type: 'startup' })).rejects.toThrow();
    });
  });
});
