import 'reflect-metadata';
import { Company } from '@darun/companies-domain';
import { Drizzle } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PostgresqlCompanyRepository } from '../repositories/PostgresqlCompanyRepository';

describe('PostgresqlCompanyRepository', () => {
  describe('insert', () => {
    it('트랜잭션으로 회사를 삽입하고 반환한다', async () => {
      const returning = vi
        .fn()
        .mockResolvedValue([{ id: 'company-1', name: '다런', address: '서울', type: 'startup', startAt: null }]);
      const values = vi.fn().mockReturnValue({ returning });
      const mockTx = { insert: vi.fn().mockReturnValue({ values }) };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
      } as unknown as Drizzle;

      const repository = new PostgresqlCompanyRepository(mockDb);
      const result = await repository.insert(new Company({ name: '다런', address: '서울', type: 'startup' }));

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result).toBeInstanceOf(Company);
      expect(result!.id).toBe('company-1');
      expect(result!.name).toBe('다런');
    });
  });

  describe('findById (DataLoader)', () => {
    let clearAllSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      clearAllSpy = vi.spyOn(DataLoader.prototype, 'clearAll');
    });

    afterEach(() => {
      clearAllSpy.mockRestore();
    });

    it('DataLoader를 통해 id로 회사를 조회한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockResolvedValue([{ id: 'company-1', name: '다런', address: '서울', type: 'startup', startAt: null }]),
          }),
        }),
        transaction: vi.fn(),
      } as unknown as Drizzle;

      const repository = new PostgresqlCompanyRepository(mockDb);
      const result = await repository.findById('company-1');

      expect(result).toBeInstanceOf(Company);
      expect(result!.id).toBe('company-1');
    });

    it('존재하지 않는 id면 null을 반환한다', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        transaction: vi.fn(),
      } as unknown as Drizzle;

      const repository = new PostgresqlCompanyRepository(mockDb);
      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
