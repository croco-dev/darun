import { Token } from 'typedi';
import type { Account } from '../entities/Account';

export interface AccountRepository {
  parseByToken: (token: string) => Promise<Account | null>;
}

export const AccountRepositoryToken = new Token<AccountRepository>('AccountRepository');
