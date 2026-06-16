import { AuthService } from '@darun/utils-auth-service-core';
import { Cookies } from 'next-client-cookies';

class AuthChecker {
  private static instance: AuthChecker;
  public static getInstance() {
    this.instance ??= new AuthChecker();
    return this.instance;
  }

  private authService?: AuthService;
  private authServiceFactory?: () => AuthService;

  init(authService: AuthService): void;
  init(authServiceFactory: () => AuthService): void;
  init(authServiceOrFactory: AuthService | (() => AuthService)): void {
    if (typeof authServiceOrFactory === 'function') {
      this.authServiceFactory = authServiceOrFactory;
      this.authService = undefined;
    } else {
      this.authService = authServiceOrFactory;
      this.authServiceFactory = undefined;
    }
  }

  async getUser(cookies: Cookies) {
    const service = this.resolveAuthService(cookies);
    return service.getUser();
  }

  async getIsAdmin(cookies: Cookies) {
    const service = this.resolveAuthService(cookies);
    return service.getUser().then(user => Boolean(user?.isAdmin));
  }

  async getIsLoggedIn(cookies: Cookies) {
    const service = this.resolveAuthService(cookies);
    return service.getUser().then(user => !!user);
  }

  private resolveAuthService(cookies: Cookies): AuthService {
    const service = this.authServiceFactory ? this.authServiceFactory() : this.authService;
    if (!service) {
      throw new Error('AuthChecker not initialized. Call init() first.');
    }
    this.setAuthStorage(service, cookies);
    return service;
  }

  private setAuthStorage(service: AuthService, cookies: Cookies) {
    service.setAuthStorage({
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
