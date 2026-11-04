import { describe, expect, it } from 'vitest';
import { ProductResearchReviewService } from '../ProductResearchReviewService';

describe('ProductResearchReviewService.validateReviewedInput', () => {
  const service = new ProductResearchReviewService();

  it.each([9, 10, 11, 12])('정규화한 고유 태그 %i개를 누락 없이 등록하거나 명시적으로 거절한다', count => {
    const tags = Array.from({ length: count }, (_, index) => `Tag ${index}`);
    const input = {
      researchJobId: 'job-tags',
      name: 'Linear',
      slug: 'linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      officialUrlConfirmed: false,
      categoryIds: [],
      features: [],
      tags: ['  tag   0  ', ...tags, 'TAG 0'],
    };
    const original = structuredClone(input);
    if (count > 10) {
      expect(() => service.validateReviewedInput(input)).toThrow(/태그.*10개/);
    } else {
      expect(service.validateReviewedInput(input).tags).toEqual(['tag 0', ...tags.slice(1)]);
    }
    expect(input).toEqual(original);
  });

  it('기능 설명의 공백을 정리한 뒤 255자 경계를 검사한다', () => {
    const summary = `${'가'.repeat(126)} ${'나'.repeat(128)}`;
    const input = {
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      officialUrlConfirmed: false,
      categoryIds: [],
      features: [
        {
          name: '이슈 관리',
          summary: `  ${'가'.repeat(126)}\n  ${'나'.repeat(128)}  `,
          emoji: '✨',
        },
      ],
      tags: [],
    };
    expect(service.validateReviewedInput(input).features[0].summary).toBe(summary);
  });

  it('accepts editor-reviewed input within limits', () => {
    const validated = service.validateReviewedInput({
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'Linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/?x=1',
      officialUrlConfirmed: false,
      categoryIds: ['cat-1'],
      features: [{ name: '이슈 관리', summary: '빠르게 관리', emoji: '✨' }],
      tags: ['협업', '협업'],
    });
    expect(validated.slug).toBe('linear');
    expect(validated.tags).toEqual(['협업']);
  });

  it('rejects unsafe slugs and oversized summaries', () => {
    expect(() =>
      service.validateReviewedInput({
        researchJobId: 'job-1',
        name: 'Linear',
        slug: 'Linear_App',
        summary: 'ok',
        logoUrl: 'https://linear.app/logo.png',
        officialUrl: 'https://linear.app/',
        officialUrlConfirmed: false,
        categoryIds: ['cat-1'],
        features: [],
        tags: [],
      })
    ).toThrow();
    expect(() =>
      service.validateReviewedInput({
        researchJobId: 'job-1',
        name: 'Linear',
        slug: 'linear',
        summary: 'x'.repeat(256),
        logoUrl: 'https://linear.app/logo.png',
        officialUrl: 'https://linear.app/',
        officialUrlConfirmed: false,
        categoryIds: ['cat-1'],
        features: [],
        tags: [],
      })
    ).toThrow();
  });

  it('allows an empty category list for later categorization', () => {
    const validated = service.validateReviewedInput({
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      officialUrlConfirmed: false,
      categoryIds: [],
      features: [],
      tags: [],
    });
    expect(validated.categoryIds).toEqual([]);
  });

  it('rejects overlong fields instead of silently truncating them', () => {
    const base = {
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      officialUrlConfirmed: false,
      categoryIds: [] as string[],
      features: [{ name: '이슈 관리', summary: '빠르게 관리', emoji: '✨' }],
      tags: [] as string[],
    };
    expect(() => service.validateReviewedInput({ ...base, name: 'x'.repeat(256) })).toThrow();
    expect(() =>
      service.validateReviewedInput({
        ...base,
        features: [{ name: 'x'.repeat(101), summary: '빠르게 관리', emoji: '✨' }],
      })
    ).toThrow();
    expect(() =>
      service.validateReviewedInput({
        ...base,
        features: [{ name: '이슈 관리', summary: 'x'.repeat(256), emoji: '✨' }],
      })
    ).toThrow();
    expect(() => service.validateReviewedInput({ ...base, tags: ['x'.repeat(101)] })).toThrow();
  });
});
