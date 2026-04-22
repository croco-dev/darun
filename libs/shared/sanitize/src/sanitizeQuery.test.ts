import { describe, expect, it } from 'vitest';
import { sanitizeQuery } from './sanitizeQuery';

describe('sanitizeQuery', () => {
  it('html 태그와 위험 문자를 제거한다', () => {
    const query = '  <b>Hello</b> <script>alert("x")</script>world  ';

    const sanitized = sanitizeQuery(query);

    expect(sanitized).toBe('Hello alert(x)world');
  });
});
