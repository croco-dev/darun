import { describe, expect, it } from 'vitest';
import { container, createAuthService } from '../app/container';

describe('admin-web container', () => {
  it('container exports stable singleton instances', () => {
    expect(container.authService).toBe(container.authService);
    expect(container.httpLink).toBe(container.httpLink);
    expect(container.apolloClient).toBe(container.apolloClient);
  });

  it('createAuthService returns a fresh instance on each call', () => {
    const first = createAuthService();
    const second = createAuthService();

    expect(first).not.toBe(second);
    expect(first).not.toBe(container.authService);
  });
});
