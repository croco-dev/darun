import { describe, expect, it } from 'vitest';
import { container } from '../app/container';

describe('visual-web smoke', () => {
  it('Apollo Client가 초기화된다', () => {
    expect(container.apolloClient).toBeDefined();
    expect(typeof container.apolloClient.query).toBe('function');
  });

  it('container는 singleton을 반환한다', () => {
    expect(container.apolloClient).toBe(container.apolloClient);
    expect(container.authService).toBe(container.authService);
  });

  it('authService에 필수 메서드가 존재한다', () => {
    expect(typeof container.authService.getUser).toBe('function');
    expect(typeof container.authService.signOut).toBe('function');
  });
});
