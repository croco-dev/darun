import { AuthService } from '@darun/utils-auth-service-core';

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

  async getUser() {
    return this.authService.getUser();
  }

  async getIsLoggedIn() {
    return this.getUser().then(user => !!user);
  }
}

export const authChecker = AuthChecker.getInstance();
