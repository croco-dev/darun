import type { Account, AccountRepository } from '@darun/accounts-domain';
import { AccountRepositoryToken } from '@darun/accounts-domain';
import { getAuth } from 'firebase-admin/auth';
import { Service } from 'typedi';

@Service(AccountRepositoryToken)
export class FirebaseAccountRepository implements AccountRepository {
  async parseByToken(token: string): Promise<Account | null> {
    const decoded = await getAuth()
      .verifyIdToken(token)
      .catch(() => null);

    if (!decoded) {
      return null;
    }

    return {
      id: decoded.uid,
      email: decoded.email,
      roles: decoded.roles ?? [],
    };
  }
}
