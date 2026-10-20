import 'reflect-metadata';
import type { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import { LlmTranslationProvider } from '../adapters/LlmTranslationProvider';

const request = {
  productId: 'p1',
  name: '이름',
  summary: '요약',
  description: '설명',
  features: [{ id: 'f-1', name: '기능', summary: '조건' }],
};
const valid = {
  name: 'Name',
  summary: 'Summary',
  description: 'Description',
  features: [{ id: 'f-1', name: 'Feature', summary: 'Condition' }],
};

describe('Provider complete bundle gate', () => {
  it.each([
    { ...valid, name: '' },
    { ...valid, summary: '' },
    { ...valid, description: null },
    { ...valid, features: [{ id: 'f-1', name: '', summary: 'Condition' }] },
    { ...valid, features: [{ id: 'f-1', name: 'Feature', summary: '' }] },
    { ...valid, features: [] },
    { ...valid, features: [{ id: 'unknown', name: 'Feature', summary: 'Condition' }] },
    { ...valid, features: [{ id: 'a'.repeat(27), name: 'Feature', summary: 'Condition' }] },
    { ...valid, features: [...valid.features, ...valid.features] },
  ])('비완전 번역을 reviewer와 row mapping 이전에 거부한다: %j', async response => {
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'test' }),
      completion: vi.fn().mockResolvedValue({ content: JSON.stringify(response) }),
    };
    await expect(
      new LlmTranslationProvider(llm as unknown as LlmClient).translateProductBundle(request)
    ).rejects.toThrow();
    expect(llm.completion).toHaveBeenCalledTimes(1);
  });

  it('검토 단계의 비완전 결과 역시 거부한다', async () => {
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'test' }),
      completion: vi
        .fn()
        .mockResolvedValueOnce({ content: JSON.stringify(valid) })
        .mockResolvedValueOnce({ content: JSON.stringify({ ...valid, summary: '' }) }),
    };
    await expect(
      new LlmTranslationProvider(llm as unknown as LlmClient).translateProductBundle(request)
    ).rejects.toThrow();
    expect(llm.completion).toHaveBeenCalledTimes(2);
  });
});
