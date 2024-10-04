import { AuthService } from '@darun/utils-auth-service-core';
import { Cookies } from 'next-client-cookies';

class AuthChecker {
  private static instance: AuthChecker;
  public static getInstance() {
    this.instance ??= new AuthChecker();
    return this.instance;
  }

  private authService: AuthService;
  init(authService: AuthService) {
    this.authService = authService;
  }

  async getUser(cookies: Cookies) {
    this.setAuthStorage(cookies);
    return this.authService.getUser();
  }

  async getIsAdmin(cookies: Cookies) {
    this.setAuthStorage(cookies);
    return this.authService.getUser().then(user => Boolean(user?.isAdmin));
  }

  async getIsLoggedIn(cookies: Cookies) {
    this.setAuthStorage(cookies);
    return this.authService.getUser().then(user => !!user);
  }

  private setAuthStorage(cookies: Cookies) {
    this.authService.setAuthStorage({
      get: (key: string) => cookies.get(key) ?? null,
      clear() {},
      set(values) {
        const keys = Object.keys(values) as (keyof typeof values)[];

        for (const key of keys) {
          const value = values[key];
          if (value) {
            cookies.set(key, value, { sameSite: 'strict', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) });
          } else {
            cookies.remove(key);
          }
        }
      },
    });
  }
}

export const authChecker = AuthChecker.getInstance();
