import { Inject, Service } from 'typedi';
import { AccountRepository } from '../repositories/AccountRepository';
import { AccountRepositoryToken } from '../repositories/AccountRepository';

@Service()
export class GetAccount {
  constructor(
    @Inject(AccountRepositoryToken)
    private readonly accountRepository: AccountRepository
  ) {}

  async execute({ token }: { token?: string }) {
    if (!token) {
      return undefined;
    }
    return this.accountRepository.parseByToken(token);
  }
}
