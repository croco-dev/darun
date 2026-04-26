import { describe, expect, it } from 'vitest';
import { sanitizeQuery } from './sanitizeQuery';

describe('sanitizeQuery', () => {
  it('html 태그와 위험 문자를 제거한다', () => {
    const query = '  <b>Hello</b> <script>alert("x")</script>world  ';

    const sanitized = sanitizeQuery(query);

    expect(sanitized).toBe('Hello alert(x)world');
  });

  it('50자를 초과하면 47자까지 자르고 말줄임표를 붙인다', () => {
    const query = 'a'.repeat(80);

    const sanitized = sanitizeQuery(query);

    expect(sanitized).toBe('a'.repeat(47) + '...');
    expect(sanitized).toHaveLength(50);
  });
});
