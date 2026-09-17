import 'reflect-metadata';
import { Product } from '@darun/products-domain';
import { BraveSearchClient, LlmClient } from '@darun/utils-llm';
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

const createGenerator = (content: string, searchClient?: BraveSearchClient) => {
  const llmClient = new FakeLlmClient();
  llmClient.completion.mockResolvedValue({ role: 'assistant', content, refusal: null });

  return {
    generator: new ProductDescriptionGeneratorImpl(llmClient, searchClient),
    llmClient,
  };
};

describe('ProductDescriptionGeneratorImpl', () => {
  it('sends compact system instructions with structured product information and without fake byline', async () => {
    const { generator, llmClient } = createGenerator('<p>설명</p>');

    await generator.generate(createProduct());

    const firstCall = llmClient.completion.mock.calls[0] ?? [];
    const messages = (Array.isArray(firstCall[0]) ? firstCall[0] : firstCall[1]) ?? [];
    const systemPrompt = messages.find(message => message.role === 'system')?.content ?? '';
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(systemPrompt.split('\n').length).toBeLessThanOrEqual(100);
    expect(systemPrompt).not.toContain('Editor. DAO');
    expect(systemPrompt).not.toContain('DAO');
    expect(systemPrompt).toContain('<h3>본문 섹션 2~3개</h3>');
    expect(systemPrompt).toContain('<h3>추천한다면 -</h3>');
    expect(systemPrompt).toContain('<h3>아쉽다면 -</h3>');
    expect(systemPrompt).toContain('가상의 에디터 이름, 바이라인, 날짜 표기');

    expect(userPrompt).toContain('제품명: Flowdesk');
    expect(userPrompt).toContain('카테고리: collaboration, automation');
    expect(userPrompt).toContain('주요 기능: 팀 업무 흐름을 보드와 자동화로 정리하는 협업 도구');
    expect(userPrompt).toContain('가격대: 확인된 정보 없음');
  });

  it('uses categoryLabels from context when provided', async () => {
    const { generator, llmClient } = createGenerator('<p>설명</p>');

    await generator.generate(createProduct(), { categoryLabels: ['협업 도구', '업무 자동화'] });

    const secondCall = llmClient.completion.mock.calls[0] ?? [];
    const messages = (Array.isArray(secondCall[0]) ? secondCall[0] : secondCall[1]) ?? [];
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('카테고리: 협업 도구, 업무 자동화');
  });

  it('filters out raw machine IDs from categoryIds when no categoryLabels are provided', async () => {
    const { generator, llmClient } = createGenerator('<p>설명</p>');
    const productWithMachineIds = new Product({
      id: 'product-2',
      slug: 'machine-id-tool',
      name: 'Machine Tool',
      summary: '도구 설명',
      logoUrl: 'https://example.com/logo.png',
      categoryIds: ['clx01234567890abcdefghijkl', '123e4567-e89b-12d3-a456-426614174000'],
    });

    await generator.generate(productWithMachineIds);

    const thirdCall = llmClient.completion.mock.calls[0] ?? [];
    const messages = (Array.isArray(thirdCall[0]) ? thirdCall[0] : thirdCall[1]) ?? [];
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('카테고리: 확인된 정보 없음');
  });

  it('주요 기능 및 링크가 context로 전달되면 userPrompt에 포함된다', async () => {
    const { generator, llmClient } = createGenerator('<p>설명</p>');

    await generator.generate(createProduct(), {
      features: [{ name: '칸반 보드', summary: '시각적 태스크 관리' }, { name: '웹훅 연동' }],
      links: [{ title: '웹사이트', link: 'https://flowdesk.io' }],
    });

    const call = llmClient.completion.mock.calls[0] ?? [];
    const messages = (Array.isArray(call[0]) ? call[0] : call[1]) ?? [];
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('[등록된 주요 기능]');
    expect(userPrompt).toContain('- 칸반 보드: 시각적 태스크 관리');
    expect(userPrompt).toContain('- 웹훅 연동');
    expect(userPrompt).toContain('[공식 링크]');
    expect(userPrompt).toContain('- 웹사이트: https://flowdesk.io');
  });

  it('BraveSearchClient를 통해 웹 검색 결과를 검색하고 userPrompt에 주입한다', async () => {
    const mockSearchClient = {
      search: vi.fn().mockResolvedValue([
        {
          title: 'Flowdesk - Smart Collaboration Tool',
          url: 'https://flowdesk.io',
          description: 'Flowdesk helps engineering and design teams coordinate tasks seamlessly.',
          extraSnippets: ['Free tier available', 'Integrates with GitHub'],
        },
      ]),
    } as unknown as BraveSearchClient;

    const { generator, llmClient } = createGenerator('<p>설명</p>', mockSearchClient);

    await generator.generate(createProduct(), { categoryLabels: ['협업 도구'] });

    expect(mockSearchClient.search).toHaveBeenCalledWith('Flowdesk 협업 도구 software review features', { count: 5 });

    const call = llmClient.completion.mock.calls[0] ?? [];
    const messages = (Array.isArray(call[0]) ? call[0] : call[1]) ?? [];
    const userPrompt = messages.find(message => message.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('[실시간 웹 검색 참고 정보 (Brave Search)]');
    expect(userPrompt).toContain('제목: Flowdesk - Smart Collaboration Tool');
    expect(userPrompt).toContain('출처: https://flowdesk.io');
    expect(userPrompt).toContain('내용: Flowdesk helps engineering and design teams coordinate tasks seamlessly.');
    expect(userPrompt).toContain('추가 내용: Free tier available / Integrates with GitHub');
  });

  it('웹 검색 중 오류가 발생해도 상품 설명 생성은 정상적으로 계속된다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockSearchClient = {
      search: vi.fn().mockRejectedValue(new Error('Search API rate limited')),
    } as unknown as BraveSearchClient;

    const { generator, llmClient } = createGenerator('<p>설명</p>', mockSearchClient);

    const result = await generator.generate(createProduct());

    expect(result).toBe('<p>설명</p>');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ProductDescriptionGenerator] Web search failed for Flowdesk:'),
      expect.any(Error)
    );
    expect(llmClient.completion).toHaveBeenCalledTimes(1);
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
