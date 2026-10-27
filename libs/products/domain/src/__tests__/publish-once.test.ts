import { afterEach, describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';

afterEach(() => vi.useRealTimers());
describe('Product 최초 발행 시각', () => {
  it('최초 발행 시각을 설정하고 이후 발행에서도 보존한다', () => {
    vi.useFakeTimers();
    const first = new Date('2026-10-20T01:02:03Z');
    vi.setSystemTime(first);
    const entity = new Product({
      name: '도구',
      slug: 'tool',
      summary: '요약',
      logoUrl: 'https://example.com/logo.png',
    });
    entity.publish();
    expect(entity.publishedAt).toEqual(first);
    vi.setSystemTime(new Date('2026-10-25T04:05:06Z'));
    entity.publish();
    expect(entity.publishedAt).toEqual(first);
  });

  it('저장된 발행일이 있으면 복원 후 발행해도 보존한다', () => {
    const first = new Date('2024-01-02T03:04:05Z');
    const entity = new Product({
      name: '도구',
      slug: 'tool',
      summary: '요약',
      logoUrl: 'https://example.com/logo.png',
      publishedAt: first,
    });
    entity.publish();
    expect(entity.publishedAt).toEqual(first);
  });
});
