import { authChecker } from '@darun/provider-auth/server';
import type { NextRequest } from 'next/server';
import type { Cookies } from 'next-client-cookies';
import { container } from '../../container';

let initialized = false;

function ensureAuthInitialized(): void {
  if (initialized) {
    return;
  }
  authChecker.init(() => container.createAuthService());
  initialized = true;
}

function requestCookies(req: NextRequest): Cookies {
  const all = req.cookies.getAll().reduce<Record<string, string>>((acc, cookie) => {
    acc[cookie.name] = cookie.value;
    return acc;
  }, {});
  return {
    get(name?: string): string | Record<string, string> | undefined {
      if (name === undefined) {
        return all;
      }
      return all[name];
    },
    set() {},
    remove() {},
    toString() {
      return req.cookies.toString();
    },
  } as Cookies;
}

/**
 * Verify the caller is an authenticated admin before touching any LLM
 * upstream. Fails closed (false) when auth is uninitialized or errors.
 */
export async function requireAdmin(req: NextRequest): Promise<boolean> {
  ensureAuthInitialized();
  try {
    return await authChecker.getIsAdmin(requestCookies(req));
  } catch {
    return false;
  }
}
