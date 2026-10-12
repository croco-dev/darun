import { describe, expect, it } from 'vitest';
import { ProductResearchReviewService } from '../ProductResearchReviewService';

describe('ProductResearchReviewService.validateReviewedInput', () => {
  const service = new ProductResearchReviewService();

  it('accepts editor-reviewed input within limits', () => {
    const validated = service.validateReviewedInput({
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'Linear',
      summary: '이슈 트래킹 도구',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/?x=1',
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
