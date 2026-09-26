import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranslationRepository, TranslationRow } from '../repositories/TranslationRepository';
import { TranslationService } from '../services/TranslationService';
import { computeSourceHash } from '../utils/sourceHash';

describe('TranslationService', () => {
  let repository: TranslationRepository;
  let service: TranslationService;

  beforeEach(() => {
    repository = {
      findOne: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      upsertMany: vi.fn(),
      findByEntity: vi.fn(),
    };
    service = new TranslationService(repository);
  });

  describe('getTranslation', () => {
    it('returns koreanValue directly when locale is ko', async () => {
      const result = await service.getTranslation({
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'ko',
        field: 'summary',
        koreanValue: '간편한 협업 툴',
      });

      expect(result).toBe('간편한 협업 툴');
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('returns translated value when sourceHash matches exactly', async () => {
      const koreanValue = '간편한 협업 툴';
      const sourceHash = computeSourceHash(koreanValue);

      vi.mocked(repository.findOne).mockResolvedValueOnce({
        id: 't-1',
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        value: 'A simple collaboration tool',
        sourceHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getTranslation({
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        koreanValue,
      });

      expect(result).toBe('A simple collaboration tool');
    });

    it('falls back to koreanValue when sourceHash is mismatched (stale translation)', async () => {
      const staleHash = computeSourceHash('이전 한국어 내용');

      vi.mocked(repository.findOne).mockResolvedValueOnce({
        id: 't-1',
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        value: 'An outdated collaboration tool',
        sourceHash: staleHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getTranslation({
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        koreanValue: '새롭게 변경된 한국어 내용',
      });

      expect(result).toBe('새롭게 변경된 한국어 내용');
    });

    it('falls back to koreanValue when sourceHash is null/undefined in existing DB row', async () => {
      vi.mocked(repository.findOne).mockResolvedValueOnce({
        id: 't-1',
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        value: 'Legacy translation without hash',
        sourceHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getTranslation({
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        koreanValue: '한국어 요약',
      });

      expect(result).toBe('한국어 요약');
    });

    it('falls back to koreanValue when repository throws', async () => {
      vi.mocked(repository.findOne).mockRejectedValueOnce(new Error('DB error'));

      const result = await service.getTranslation({
        entityType: 'Product',
        entityId: 'p-1',
        locale: 'en',
        field: 'summary',
        koreanValue: '한국어 요약',
      });

      expect(result).toBe('한국어 요약');
    });
  });

  describe('getTranslations', () => {
    it('returns empty map when entries are empty', async () => {
      const result = await service.getTranslations({
        entityType: 'Product',
        locale: 'en',
        entries: [],
      });

      expect(result.size).toBe(0);
    });

    it('returns fresh translations and falls back to koreanValue for stale ones', async () => {
      const freshKorean = '최신 한국어';
      const staleKorean = '변경된 한국어';

      const rows: TranslationRow[] = [
        {
          id: 't-1',
          entityType: 'Product',
          entityId: 'p-1',
          locale: 'en',
          field: 'summary',
          value: 'Fresh English summary',
          sourceHash: computeSourceHash(freshKorean),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 't-2',
          entityType: 'Product',
          entityId: 'p-1',
          locale: 'en',
          field: 'name',
          value: 'Stale English name',
          sourceHash: computeSourceHash('과거 한국어'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(repository.findMany).mockResolvedValueOnce(rows);

      const result = await service.getTranslations({
        entityType: 'Product',
        locale: 'en',
        entries: [
          { entityId: 'p-1', field: 'summary', koreanValue: freshKorean },
          { entityId: 'p-1', field: 'name', koreanValue: staleKorean },
        ],
      });

      expect(result.get('p-1:summary')).toBe('Fresh English summary');
      expect(result.get('p-1:name')).toBe(staleKorean); // fallback because hash mismatched
    });
  });
});
