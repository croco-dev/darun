import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import { ProductDescriptionGeneratorImpl } from '../services/ProductDescriptionGeneratorImpl';

class FakeLlmClient extends LlmClient {
  public readonly completion = vi.fn<LlmClient['completion']>();
}

const createProduct = () =>
  new Product({
    id: 'product-1',
    slug: 'flowdesk',
    name: 'Flowdesk',
    summary: '팀 업무 흐름을 보드와 자동화로 정리하는 협업 도구',
    logoUrl: 'https://example.com/logo.png',
    categoryIds: ['collaboration', 'automation'],
  });

const createGenerator = (content: string) => {
  const llmClient = new FakeLlmClient();
  llmClient.completion.mockResolvedValue({ role: 'assistant', content, refusal: null });

  return {
    generator: new ProductDescriptionGeneratorImpl(llmClient),
    llmClient,
  };
};

describe('ProductDescriptionGeneratorImpl', () => {
  it('sends compact system instructions with structured product information', async () => {
    const { generator, llmClient } = createGenerator('<p>설명</p>');

    await generator.generate(createProduct());

    const messages = llmClient.completion.mock.calls[0]?.[1] ?? [];
    const systemPrompt = messages.find(message => message.role === 'system')?.content ?? '';
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(systemPrompt.split('\n').length).toBeLessThanOrEqual(100);
    expect(userPrompt).toContain('제품명: Flowdesk');
    expect(userPrompt).toContain('카테고리: collaboration, automation');
    expect(userPrompt).toContain('주요 기능: 팀 업무 흐름을 보드와 자동화로 정리하는 협업 도구');
    expect(userPrompt).toContain('가격대: 확인된 정보 없음');
  });

  it('keeps only allowed HTML tags in the generated description', async () => {
    const { generator } = createGenerator(
      '<h2 onclick="alert(1)">제목</h2><p><strong>장점</strong><em>강조</em><code>코드</code><a href="https://example.com">링크</a></p><script>alert(1)</script><hr><ul><li>항목</li></ul>'
    );

    const result = await generator.generate(createProduct());

    expect(result).toBe('<h2>제목</h2><p><strong>장점</strong><em>강조</em>코드링크</p><ul><li>항목</li></ul>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<code');
    expect(result).not.toContain('<a');
    expect(result).not.toContain('<hr');
    expect(result).not.toContain('onclick');
  });
});
