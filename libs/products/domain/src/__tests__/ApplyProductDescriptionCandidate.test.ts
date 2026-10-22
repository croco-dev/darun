import { describe, expect, it, vi } from 'vitest';
import { Product } from '../entities/Product';
import type { ProductDescriptionJobEntity } from '../entities/ProductDescriptionJobEntity';
import {
  ApplyProductDescriptionCandidate,
  type ProductDescriptionApplySession,
} from '../usecases/ApplyProductDescriptionCandidate';

function fixture(overrides: Partial<ProductDescriptionJobEntity> = {}) {
  const product = new Product({
    id: 'p',
    name: '제품',
    slug: 'product',
    summary: '요약',
    logoUrl: 'https://example.com/logo.png',
    description: '<p>사람 편집</p>',
  });
  const job: ProductDescriptionJobEntity = {
    id: 'j',
    productId: 'p',
    status: 'completed',
    evidenceHashVersion: 'v2',
    evidenceHash: 'v2-hash',
    baseDescriptionHash: 'base',
    candidateHtml: '<blockquote>저장된 &amp; 후보</blockquote>',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
  const session: ProductDescriptionApplySession = {
    findJob: vi.fn().mockResolvedValue(job),
    findLockedProduct: vi.fn().mockResolvedValue(product),
    assembleLocked: vi.fn().mockResolvedValue({
      evidence: { productId: 'p', productName: '제품', items: [] },
      evidenceHashVersion: 'v2',
      evidenceHash: 'v2-hash',
      legacyEvidenceHash: 'v1-hash',
      baseDescriptionHash: 'base',
    }),
    applyLocked: vi.fn().mockResolvedValue(product),
    markAppliedLocked: vi.fn().mockResolvedValue({ ...job, appliedAt: new Date('2026-10-12') }),
  };
  const usecase = new ApplyProductDescriptionCandidate({ transaction: { run: async work => work(session) } });
  return { job, product, session, usecase };
}

describe('atomic candidate application', () => {
  it.each(['v1', 'v2'])('preserves stored renderer %s HTML bytes', async rendererVersion => {
    const { usecase, session, job } = fixture({ rendererVersion });
    const result = await usecase.execute({ jobId: 'j' });
    expect(session.applyLocked).toHaveBeenCalledWith({ productId: 'p', candidateHtml: job.candidateHtml });
    expect(result.alreadyApplied).toBe(false);
    expect(result.job.appliedAt).toEqual(new Date('2026-10-12'));
  });

  it('returns historical application before checking status, candidate, or current hashes', async () => {
    const { usecase, session, product } = fixture({
      appliedAt: new Date('2025-01-01'),
      status: 'failed',
      candidateHtml: null,
    });
    expect(await usecase.execute({ jobId: 'j' })).toMatchObject({ product, alreadyApplied: true });
    expect(session.assembleLocked).not.toHaveBeenCalled();
    expect(session.applyLocked).not.toHaveBeenCalled();
    expect(session.markAppliedLocked).not.toHaveBeenCalled();
  });

  it('revalidates the job after acquiring its Product mutex', async () => {
    const { usecase, session, job } = fixture();
    vi.mocked(session.findJob)
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({ ...job, appliedAt: new Date() });
    expect((await usecase.execute({ jobId: 'j' })).alreadyApplied).toBe(true);
    expect(session.findJob).toHaveBeenNthCalledWith(1, 'j', false);
    expect(session.findJob).toHaveBeenNthCalledWith(2, 'j', true);
    expect(session.findLockedProduct).toHaveBeenCalledWith('p');
    expect(session.applyLocked).not.toHaveBeenCalled();
  });

  it.each([
    { version: null, links: false, matches: true, accepted: true },
    { version: null, links: true, matches: true, accepted: false },
    { version: null, links: false, matches: false, accepted: false },
    { version: 'v2', links: true, matches: true, accepted: true },
    { version: 'v2', links: true, matches: false, accepted: false },
    { version: 'unknown', links: false, matches: true, accepted: false },
  ])(
    'checks persisted version and legacy selected links: $version/$links/$matches',
    async ({ version, links, matches, accepted }) => {
      const { usecase, session } = fixture({
        evidenceHashVersion: version,
        evidenceHash: version === 'v2' ? 'v2-hash' : 'v1-hash',
      });
      vi.mocked(session.assembleLocked).mockResolvedValue({
        evidence: {
          productId: 'p',
          productName: '제품',
          items: links
            ? [{ id: 'link:l', kind: 'link', title: '소개', displayText: '링크 문구', url: 'https://example.com' }]
            : [],
        },
        evidenceHashVersion: 'v2',
        evidenceHash: matches ? 'v2-hash' : 'changed',
        legacyEvidenceHash: matches ? 'v1-hash' : 'changed',
        baseDescriptionHash: 'base',
      });
      if (accepted) expect((await usecase.execute({ jobId: 'j' })).alreadyApplied).toBe(false);
      else {
        await expect(usecase.execute({ jobId: 'j' })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
        expect(session.applyLocked).not.toHaveBeenCalled();
      }
    }
  );

  it('rejects a changed canonical description without writing candidate or marker', async () => {
    const { usecase, session } = fixture({ baseDescriptionHash: 'old-body' });
    await expect(usecase.execute({ jobId: 'j' })).rejects.toMatchObject({ code: 'STALE_CANDIDATE' });
    expect(session.applyLocked).not.toHaveBeenCalled();
    expect(session.markAppliedLocked).not.toHaveBeenCalled();
  });

  it('does not convert marker failure into a fabricated alreadyApplied response', async () => {
    const { usecase, session } = fixture();
    vi.mocked(session.markAppliedLocked).mockRejectedValue(new Error('marker failure'));
    await expect(usecase.execute({ jobId: 'j' })).rejects.toThrow('marker failure');
  });
});
