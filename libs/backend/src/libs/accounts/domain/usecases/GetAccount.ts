import { Inject, Service } from 'typedi';
import { AccountRepository, AccountRepositoryToken } from '../repositories/AccountRepository';

@Service()
export class GetAccount {
  constructor(@Inject(AccountRepositoryToken) private accountRepository: AccountRepository) {}

  async execute({ token }: { token?: string }) {
    if (!token) {
      return undefined;
    }
    return this.accountRepository.parseByToken(token);
  }
}
