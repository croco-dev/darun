import { Account, AccountRepository } from '@darun/accounts-domain';
import { AccountRepositoryToken } from '@darun/accounts-domain';
import { getAuth } from 'firebase-admin/auth';
import { Service } from 'typedi';

@Service(AccountRepositoryToken)
export class FirebaseAccountRepository implements AccountRepository {
  async parseByToken(token: string): Promise<Account | null> {
    const decoded = await getAuth()
      .verifyIdToken(token)
      .catch((error: unknown) => {
        if (this.isInvalidTokenError(error)) {
          return null;
        }
        throw error;
      });

    if (!decoded) {
      return null;
    }

    return {
      id: decoded.uid,
      email: decoded.email,
      roles: decoded.roles ?? [],
    };
  }

  private isInvalidTokenError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const code = (error as Record<string, unknown>).code;
    if (typeof code !== 'string') {
      return false;
    }
    return ['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/argument-error'].includes(
      code
    );
  }
}
