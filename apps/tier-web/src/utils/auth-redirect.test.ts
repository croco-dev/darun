import { describe, expect, it } from 'vitest';
import { getAuthRedirect } from './auth-redirect';

const origin = 'http://localhost:3003';
describe('callback destination', () => {
  it('preserves a local path, query and fragment', () => {
    expect(getAuthRedirect('/apps?tier=0#results', origin).href).toBe(`${origin}/apps?tier=0#results`);
  });
  it.each(['/admin?q=Google%20Maps', '/admin?q=Google Maps'])('preserves local query spaces in %s', value => {
    expect(getAuthRedirect(value, origin).href).toBe(`${origin}/admin?q=Google%20Maps`);
  });
  it.each([
    '//evil.test',
    '/\\evil.test',
    'https://user@evil.test',
    'https://localhost:3003@evil.test',
    '/%2f%2fevil.test',
    '/%5cevil.test',
    '/\nevil.test',
    '/%00evil.test',
    'javascript:alert(1)',
    '/%',
  ])('rejects %s', value => {
    expect(getAuthRedirect(value, origin).href).toBe(`${origin}/`);
  });
});
