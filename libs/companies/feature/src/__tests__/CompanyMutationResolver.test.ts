import 'reflect-metadata';

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    InputType: () => () => {},
    Resolver: () => () => {},
    ID: class ID {},
  };
});

import { Company } from '@darun/companies-domain';
import { describe, expect, it, vi } from 'vitest';
import { CompanyMutationResolver } from '../Company.mutation.resolver';

describe('CompanyMutationResolver', () => {
  describe('createCompany', () => {
    it('회사를 생성하고 반환한다', async () => {
      const createCompanyUseCase = { execute: vi.fn() };
      const company = new Company({ id: 'company-1', name: '다런', address: '서울', type: 'startup' });
      createCompanyUseCase.execute.mockResolvedValue(company);

      const resolver = new CompanyMutationResolver(createCompanyUseCase as never);
      const result = await resolver.createCompany({
        name: '다런',
        address: '서울',
        type: 'startup',
        startAt: undefined,
      });

      expect(createCompanyUseCase.execute).toHaveBeenCalledWith({
        name: '다런',
        address: '서울',
        type: 'startup',
        startAt: undefined,
      });
      expect(result).toEqual({ company });
    });

    it('startAt이 주어지면 새 Date로 복사한다', async () => {
      const createCompanyUseCase = { execute: vi.fn() };
      createCompanyUseCase.execute.mockResolvedValue(new Company({ name: '다런', address: '서울', type: 'startup' }));

      const resolver = new CompanyMutationResolver(createCompanyUseCase as never);
      const startAt = new Date('2024-01-01');
      await resolver.createCompany({ name: '다런', address: '서울', type: 'startup', startAt });

      expect(createCompanyUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ startAt: expect.any(Date) }));
    });
  });
});
