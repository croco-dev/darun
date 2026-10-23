import { describe, expect, it } from 'vitest';
import { container } from '../app/container';

describe('service-web container', () => {
  it('container exports stable singleton instances', () => {
    expect(container.authService).toBe(container.authService);
    expect(container.httpLink).toBe(container.httpLink);
    expect(container.getApolloClient('ko')).toBe(container.getApolloClient('ko'));
  });
});
