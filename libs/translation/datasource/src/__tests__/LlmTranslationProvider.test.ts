import type { LlmClient } from '@darun/utils-llm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmTranslationProvider } from '../adapters/LlmTranslationProvider';

describe('LlmTranslationProvider', () => {
  let mockLlmClient: LlmClient;
  let provider: LlmTranslationProvider;

  beforeEach(() => {
    mockLlmClient = {
      completion: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({ model: 'custom-llm-model' }),
    } as unknown as LlmClient;
    provider = new LlmTranslationProvider(mockLlmClient);
  });

  describe('translateSingle', () => {
    it('translates plain text with label mode and returns sourceHash', async () => {
      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: 'Notion',
      } as never);

      const result = await provider.translateSingle({
        entityType: 'Product',
        entityId: 'p-1',
        field: 'name',
        koreanText: '노션',
        mode: 'label',
      });

      expect(result.translatedText).toBe('Notion');
      expect(result.model).toBe('custom-llm-model');
      expect(result.sourceHash).toBeDefined();
      expect(mockLlmClient.completion).toHaveBeenCalledTimes(1);
      expect(mockLlmClient.completion).toHaveBeenCalledWith(
        'custom-llm-model',
        expect.any(Array)
      );
    });

    it('translates HTML content preserving placeholders', async () => {
      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: '⟦HTML_0000⟧Hello ⟦HTML_0001⟧world⟦HTML_0002⟧⟦HTML_0003⟧',
      } as never);

      const result = await provider.translateSingle({
        entityType: 'Product',
        entityId: 'p-1',
        field: 'description',
        koreanText: '<p>안녕 <strong>세계</strong></p>',
        mode: 'label',
        isHtml: true,
      });

      expect(result.translatedText).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('runs 2-pass review for editorial mode', async () => {
      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: 'The greatest ultimate collaboration tool ever created!',
      } as never);
      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: 'A simple collaboration tool for teams.',
      } as never);

      const result = await provider.translateSingle({
        entityType: 'Product',
        entityId: 'p-1',
        field: 'summary',
        koreanText: '팀을 위한 간편한 협업 툴입니다.',
        mode: 'editorial',
      });

      expect(mockLlmClient.completion).toHaveBeenCalledTimes(2);
      expect(result.translatedText).toBe('A simple collaboration tool for teams.');
    });
  });

  describe('translateProductBundle', () => {
    it('translates product bundle with features preserving feature IDs and description HTML', async () => {
      const mockBundleResponse = {
        name: 'Darun Flow',
        summary: 'A workflow tool for developers.',
        description: '⟦HTML_0000⟧Easily automate tasks.⟦HTML_0001⟧',
        features: [
          { id: 'f-1', name: 'Trigger', summary: 'Webhook triggers' },
          { id: 'f-2', name: 'Action', summary: 'Automated actions' },
        ],
      };

      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(mockBundleResponse),
      } as never);

      const result = await provider.translateProductBundle({
        productId: 'prod-1',
        name: '다른 플로우',
        summary: '개발자를 위한 워크플로우 툴입니다.',
        description: '<p>쉽게 작업을 자동화하세요.</p>',
        features: [
          { id: 'f-1', name: '트리거', summary: '웹훅 트리거' },
          { id: 'f-2', name: '액션', summary: '자동화 액션' },
        ],
      });

      expect(result.product.name).toBe('Darun Flow');
      expect(result.product.summary).toBe('A workflow tool for developers.');
      expect(result.product.description).toBe('<p>Easily automate tasks.</p>');
      expect(result.features).toHaveLength(2);
      expect(result.features[0].id).toBe('f-1');
      expect(result.features[0].name).toBe('Trigger');
      expect(result.features[1].id).toBe('f-2');
      expect(result.features[1].name).toBe('Action');
    });

    it('throws error when returned features do not match expected feature IDs', async () => {
      const invalidResponse = {
        name: 'Product',
        summary: 'Summary',
        description: 'Description',
        features: [{ id: 'f-wrong', name: 'Unknown', summary: 'Unknown' }],
      };

      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(invalidResponse),
      } as never);

      await expect(
        provider.translateProductBundle({
          productId: 'prod-1',
          name: '제품',
          summary: '요약',
          description: '설명',
          features: [{ id: 'f-1', name: '기능', summary: '설명' }],
        })
      ).rejects.toThrow(/기능 ID\(f-1\)가 누락되었습니다/);
    });
  });
});
