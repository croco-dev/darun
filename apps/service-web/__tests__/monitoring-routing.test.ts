import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it, vi } from 'vitest';
import { config } from '../middleware';

vi.mock('next-intl/middleware', () => ({ default: vi.fn() }));

describe('Sentry tunnel routing', () => {
  it.each(['/monitoring?o=123&p=456&r=us', '/monitoring/?o=123&p=456'])(
    '%s reaches the tunnel rewrite without a locale redirect',
    url => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
  );

  it.each(['/monitoring-guide', '/monitoring/details', '/ko', '/en/products/notion', '/ko.md'])(
    '%s still uses document middleware',
    url => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
  );
});
