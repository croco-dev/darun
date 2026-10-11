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
});
