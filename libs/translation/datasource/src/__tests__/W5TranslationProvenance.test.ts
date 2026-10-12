import type { LlmClient } from '@darun/utils-llm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmTranslationProvider } from '../adapters/LlmTranslationProvider';

describe('W5 translation provenance: provider and codec', () => {
  let mockLlmClient: LlmClient;
  let provider: LlmTranslationProvider;

  beforeEach(() => {
    mockLlmClient = {
      completion: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({ model: 'w5-model' }),
    } as unknown as LlmClient;
    provider = new LlmTranslationProvider(mockLlmClient);
  });

  it('W5-A1: 중복·미지·누락 ID와 빈 필수명을 거부하고 행을 쓰지 않는다(검증자 경유)', async () => {
    const base = {
      name: 'Name',
      summary: 'Summary',
      description: 'Description',
      features: [{ id: 'f-1', name: 'F1', summary: 'S1' }],
    };
    const request = {
      productId: 'prod-w5',
      name: '이름',
      summary: '요약',
      description: '설명',
      features: [{ id: 'f-1', name: '기능', summary: '설명' }],
    };
    const invalidCases: unknown[] = [
      { ...base, features: [{ id: 'f-1', name: 'F1', summary: 'S1' }, { id: 'f-1', name: 'F1d', summary: 'S1d' }] },
      { ...base, features: [{ id: 'f-evil', name: 'Evil', summary: 'Evil' }] },
      { ...base, features: [] },
      { ...base, name: '   ' },
      { ...base, features: [{ id: 'f-1', name: '   ', summary: 'S1' }] },
    ];

    for (const response of invalidCases) {
      vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({ role: 'assistant', content: JSON.stringify(response) } as never);
      await expect(provider.translateProductBundle(request)).rejects.toThrow();
    }
    expect(mockLlmClient.completion).toHaveBeenCalledTimes(invalidCases.length);
  });

  it('W5-A4: 순서가 바뀐 태그 토큰은 reviewed 성공으로 기록되지 않는다', async () => {
    vi.mocked(mockLlmClient.completion).mockResolvedValueOnce({
      role: 'assistant',
      content: JSON.stringify({
        name: 'Name',
        summary: 'Summary',
        description: '⟦HTML_0001⟧Reordered⟦HTML_0000⟧',
        features: [],
      }),
    } as never);

    await expect(
      provider.translateProductBundle({
        productId: 'prod-w5',
        name: '이름',
        summary: '요약',
        description: '<p>설명</p>',
        features: [],
      })
    ).rejects.toThrow(/order mismatch/);
  });

  it('W5-A4: 문자 그대로의 플레이스홀더 충돌과 손상된 reviewer 출력은 성공으로 기록되지 않는다', async () => {
    const { encodeHtml, decodeHtml } = await import('../codecs/htmlPlaceholderCodec');

    expect(() => encodeHtml('<p>태그</p> 그리고 ⟦HTML_0099⟧ 문자')).toThrow(/literal placeholder/);

    const { placeholders, tokenOrder } = encodeHtml('<p>내용</p>');
    expect(() => decodeHtml('⟦HTML_0000⟧Content⟦HTML_0000⟧', placeholders, tokenOrder)).toThrow(
      /HTML placeholder missing/
    );

    vi.mocked(mockLlmClient.completion)
      .mockResolvedValueOnce({ role: 'assistant', content: 'writer candidate' } as never)
      .mockResolvedValueOnce({ role: 'assistant', content: '   ' } as never);
    await expect(
      provider.translateSingle({
        entityType: 'Product',
        entityId: 'p-1',
        field: 'summary',
        koreanText: '요약',
        mode: 'editorial',
      })
    ).rejects.toThrow(/검토 결과가 비어 있습니다/);

    vi.mocked(mockLlmClient.completion)
      .mockResolvedValueOnce({ role: 'assistant', content: '⟦HTML_0000⟧writer⟦HTML_0001⟧' } as never)
      .mockResolvedValueOnce({ role: 'assistant', content: 'reviewer dropped placeholders' } as never);
    await expect(
      provider.translateSingle({
        entityType: 'Product',
        entityId: 'p-1',
        field: 'description',
        koreanText: '<p>설명</p>',
        mode: 'editorial',
        isHtml: true,
      })
    ).rejects.toThrow(/placeholder count mismatch/);
  });
});
