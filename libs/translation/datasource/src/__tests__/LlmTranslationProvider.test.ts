/// <reference lib="es2021.string" />
import 'reflect-metadata';
import type { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { LlmTranslationProvider } from '../adapters/LlmTranslationProvider';

function client() {
  const completion = vi.fn().mockImplementation(async (_model, messages) => {
    const prompt = messages[1].content as string;
    if (prompt.includes('번역할 원본 데이터 (JSON):')) {
      const json = prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!;
      return {
        content: json
          .replaceAll('이름', 'Name')
          .replaceAll('요약', 'Summary')
          .replaceAll('설명', 'Description')
          .replaceAll('기능', 'Feature'),
      };
    }
    const text = prompt.includes('[한국어 원문]')
      ? prompt.split('[한국어 원문]\n')[1]!.split('\n\n[영어 번역 초안]')[0]!
      : prompt.split('번역할 원문:\n')[1]!;
    return { content: text.replaceAll('이름', 'Name').replaceAll('요약', 'Summary').replaceAll('설명', 'Description') };
  });
  return { completion, getConfig: vi.fn().mockResolvedValue({ model: 'test-model' }) };
}
const request = {
  productId: 'p1',
  name: '이름 Darun',
  summary: '요약 42',
  description: '<p title="x > y">설명 &amp;</p>',
  features: [{ id: 'feature-1', name: '기능', summary: '요약' }],
};

describe('Actual LlmTranslationProvider', () => {
  it('writer/reviewer 모두 검증하고 원문 provenance와 보호된 문서 바이트를 반환한다', async () => {
    const llm = client();
    const provider = new LlmTranslationProvider(llm as unknown as LlmClient);
    const result = await provider.translateProductBundle(request);
    expect(llm.completion).toHaveBeenCalledTimes(2);
    expect(result.product).toMatchObject({
      name: 'Name Darun',
      summary: 'Summary 42',
      description: '<p title="x > y">Description &amp;</p>',
    });
    expect(result.features).toMatchObject([{ id: 'feature-1', name: 'Feature', summary: 'Summary' }]);
    expect(result.model).toBe('test-model');
    expect(result.promptVersion).toBe('v2.0.0');
    expect(result.product.descriptionSourceHash).toMatch(/^document:v1:[a-f0-9]{64}$/);
  });

  const referenceSource = '[안내][] [안내] [본문][안내]\n\n[안내]: <https://example.com/guide?x=1&amp;y=2>';
  const referenceEnglish =
    '[Final guide][안내] [Final guide][안내] [Final article][안내]\n\n[안내]: <https://example.com/guide?x=1&amp;y=2>';
  function referenceClient(
    failure?: 'writer structure' | 'reviewer structure' | 'reviewer tokens' | 'reviewer failure'
  ) {
    return {
      getConfig: vi.fn().mockResolvedValue({ model: 'reference-model' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const prompt = messages[1].content as string;
        const reviewer = prompt.includes('검토할 번역 초안:') || prompt.includes('[영어 번역 초안]');
        if (reviewer && failure === 'reviewer failure') throw new Error('reference review failed');
        const text = prompt.includes('번역할 원본 데이터 (JSON):')
          ? prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!
          : reviewer
            ? prompt.split('[영어 번역 초안]\n')[1]!
            : prompt.split('번역할 원문:\n')[1]!;
        let content = text
          .replaceAll('안내', reviewer ? 'Final guide' : 'Writer guide')
          .replaceAll('본문', reviewer ? 'Final article' : 'Writer article')
          .replaceAll('Writer guide', reviewer ? 'Final guide' : 'Writer guide')
          .replaceAll('Writer article', reviewer ? 'Final article' : 'Writer article')
          .replaceAll('이름', 'Name')
          .replaceAll('요약', 'Summary')
          .replaceAll('기능', 'Feature');
        if (failure === (reviewer ? 'reviewer structure' : 'writer structure'))
          content = content.replace(reviewer ? 'Final guide' : 'Writer guide', '**Broken guide**');
        if (reviewer && failure === 'reviewer tokens') content = content.replace(/⟦HTML_[^⟧]*⟧/, '');
        return { content };
      }),
    };
  }

  it.each([
    ['Product', 'description'],
    ['Magazine', 'content'],
  ])('%s %s의 실제 Writer/Reviewer가 implicit 표시 문구를 번역하고 원문 hash를 반환한다', async (entityType, field) => {
    const llm = referenceClient();
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
      entityType,
      entityId: 'reference-entity',
      field,
      koreanText: referenceSource,
      mode: 'editorial',
    });
    expect(result).toMatchObject({
      translatedText: referenceEnglish,
      sourceHash: `document:v1:${createHash('sha256').update(referenceSource).digest('hex')}`,
      model: 'reference-model',
      promptVersion: 'v2.0.0',
    });
    expect(llm.completion.mock.calls[0]![1][1].content).toContain('안내');
    expect(llm.completion.mock.calls[1]![1][1].content).toContain('Writer guide');
  });

  it('bundle도 같은 definition을 공유하는 collapsed·shortcut·full 표시 문구를 최종 영어로 저장한다', async () => {
    const llm = referenceClient();
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateProductBundle({
      ...request,
      description: referenceSource,
    });
    expect(result.product).toMatchObject({
      name: 'Name Darun',
      summary: 'Summary 42',
      description: referenceEnglish,
      descriptionSourceHash: `document:v1:${createHash('sha256').update(referenceSource).digest('hex')}`,
    });
    expect(result.features).toMatchObject([{ id: 'feature-1', name: 'Feature', summary: 'Summary' }]);
  });

  it.each(['writer structure', 'reviewer structure', 'reviewer tokens', 'reviewer failure'] as const)(
    '%s는 implicit 참조 번역도 거절하고 Writer fallback하지 않는다',
    async failure => {
      const llm = referenceClient(failure);
      await expect(
        new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
          entityType: 'Magazine',
          entityId: 'm1',
          field: 'content',
          koreanText: referenceSource,
          mode: 'editorial',
        })
      ).rejects.toThrow(failure === 'reviewer failure' ? /reference review failed/ : /structure|placeholder/);
      if (failure === 'writer structure') expect(llm.completion).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['title', 'summary', 'content'])(
    'Magazine %s도 editorial reviewer 실패를 성공으로 처리하지 않는다',
    async field => {
      const llm = client();
      llm.completion.mockResolvedValueOnce({ content: 'Writer' }).mockRejectedValueOnce(new Error('reviewer failed'));
      const provider = new LlmTranslationProvider(llm as unknown as LlmClient);
      await expect(
        provider.translateSingle({ entityType: 'Magazine', entityId: 'm1', field, koreanText: '설명', mode: 'label' })
      ).rejects.toThrow('reviewer failed');
      expect(llm.completion).toHaveBeenCalledTimes(2);
    }
  );

  it('빈 optional source는 LLM 없이 빈 번역과 provenance를 반환한다', async () => {
    const llm = client();
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
      entityType: 'Magazine',
      entityId: 'm1',
      field: 'summary',
      koreanText: '',
      mode: 'editorial',
    });
    expect(result.translatedText).toBe('');
    expect(llm.completion).not.toHaveBeenCalled();
  });

  it('reviewer가 토큰을 지우면 writer로 fallback하지 않는다', async () => {
    const llm = client();
    const original = llm.completion.getMockImplementation()!;
    llm.completion.mockImplementationOnce(original).mockResolvedValueOnce({ content: 'No protected tokens' });
    await expect(
      new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
        entityType: 'Product',
        entityId: 'p1',
        field: 'description',
        koreanText: '<p>설명</p>',
        mode: 'editorial',
      })
    ).rejects.toThrow(/placeholder/);
  });

  const plainCases: Array<{
    entityType: string;
    field: string;
    mode: 'label' | 'product_copy' | 'editorial';
    source: string;
    english: string;
  }> = [
    {
      entityType: 'Product',
      field: 'name',
      mode: 'label',
      source: '    들여쓰기 제품명',
      english: 'Indented product name',
    },
    {
      entityType: 'ProductFeature',
      field: 'summary',
      mode: 'product_copy',
      source: '`백틱 기능 요약` 정상 문장',
      english: '`Backtick feature summary` normal sentence',
    },
    {
      entityType: 'Magazine',
      field: 'title',
      mode: 'editorial',
      source: '```\n펜스 잡지 제목\n```',
      english: '```\nFenced magazine title\n```',
    },
    {
      entityType: 'Magazine',
      field: 'summary',
      mode: 'editorial',
      source: '일반 잡지 요약',
      english: 'Normal magazine summary',
    },
  ];

  it.each(plainCases)(
    '$entityType $field의 들여쓰기·backtick·fence 원문도 placeholder 없이 번역한다',
    async ({ entityType, field, mode, source, english }) => {
      const prompts: string[] = [];
      const llm = {
        getConfig: vi.fn().mockResolvedValue({ model: 'plain-model' }),
        completion: vi.fn().mockImplementation(async (_model, messages) => {
          const prompt = messages[1].content as string;
          prompts.push(prompt);
          const text = prompt.includes('[영어 번역 초안]\n')
            ? prompt.split('[영어 번역 초안]\n')[1]!
            : prompt.split('번역할 원문:\n')[1]!;
          return { content: text.replaceAll(source, english) };
        }),
      };
      const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
        entityType,
        entityId: 'entity-1',
        field,
        koreanText: source,
        mode,
      });
      // The Writer must receive the Korean itself, never a document placeholder.
      expect(prompts[0]).toContain(source);
      expect(prompts[0]).not.toContain('⟦HTML_');
      expect(result.translatedText).toBe(english);
      expect(result.translatedText).not.toBe(source);
      if (prompts.length > 1) {
        expect(prompts[1]).toContain(source);
        expect(prompts[1]).toContain(english);
      }
    }
  );

  it('bundle name/summary/features의 literal 표기는 번역되고 description의 code literal은 보존한다', async () => {
    const bundle = {
      productId: 'p1',
      name: '    들여쓰기 제품명',
      summary: '`백틱 요약` 정상 문장',
      description: '<p>설명 <code>literal-code</code> 한국어</p>',
      features: [{ id: 'f-1', name: '```펜스 기능명```', summary: '    들여쓰기 기능 요약' }],
    };
    const prompts: string[] = [];
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'bundle-model' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const prompt = messages[1].content as string;
        prompts.push(prompt);
        const json = prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!;
        return {
          content: json
            .replaceAll('    들여쓰기 제품명', 'Indented product name')
            .replaceAll('`백틱 요약` 정상 문장', '`Backtick summary` normal sentence')
            .replaceAll('설명', 'Description')
            .replaceAll('한국어', 'Korean')
            .replaceAll('```펜스 기능명```', '```Fenced feature name```')
            .replaceAll('    들여쓰기 기능 요약', 'Indented feature summary'),
        };
      }),
    };
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateProductBundle(bundle);
    expect(prompts[0]).toContain('    들여쓰기 제품명');
    expect(prompts[0]).toContain('```펜스 기능명```');
    // The reverse case: a real code literal inside the document description stays hidden and preserved.
    expect(prompts[0]).not.toContain('literal-code');
    expect(result.product).toMatchObject({
      name: 'Indented product name',
      summary: '`Backtick summary` normal sentence',
      description: '<p>Description <code>literal-code</code> Korean</p>',
    });
    expect(result.features).toMatchObject([
      { id: 'f-1', name: '```Fenced feature name```', summary: 'Indented feature summary' },
    ]);
  });

  it('문서 필드의 literal backtick과 들여쓰기 code block 내용은 반대로 번역되지 않는다', async () => {
    const source = '본문 설명 `literal-code` 더보기\n\n    들여쓰기 코드 블록';
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'document-model' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const prompt = messages[1].content as string;
        const text = prompt.includes('[영어 번역 초안]\n')
          ? prompt.split('[영어 번역 초안]\n')[1]!
          : prompt.split('번역할 원문:\n')[1]!;
        return { content: text.replaceAll('본문 설명', 'Body text').replaceAll('더보기', 'See more') };
      }),
    };
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateSingle({
      entityType: 'Product',
      entityId: 'p1',
      field: 'description',
      koreanText: source,
      mode: 'editorial',
    });
    expect(result.translatedText).toBe('Body text `literal-code` See more\n\n    들여쓰기 코드 블록');
  });

  it.each(['single', 'bundle'] as const)('%s 문서의 HTML code/pre literal은 Writer/Reviewer에도 숨긴다', async path => {
    const source =
      '본문 <code>  안내<span>중첩</span>\n\t리터럴 </code>\n\n<pre>  고정값\n<span>하위</span> </pre>\n\n더보기';
    const prompts: string[] = [];
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'document-model' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const prompt = messages[1].content as string;
        prompts.push(prompt);
        const text =
          path === 'bundle'
            ? prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!
            : prompt.includes('[한국어 원문]')
              ? prompt.split('[한국어 원문]\n')[1]!.split('\n\n[영어 번역 초안]')[0]!
              : prompt.split('번역할 원문:\n')[1]!;
        return { content: text.replaceAll('본문', 'Body').replaceAll('더보기', 'More').replaceAll('안내', 'Guide') };
      }),
    };
    const provider = new LlmTranslationProvider(llm as unknown as LlmClient);
    const result =
      path === 'bundle'
        ? (await provider.translateProductBundle({ ...request, description: source })).product
        : await provider.translateSingle({
            entityType: 'Product',
            entityId: 'p1',
            field: 'description',
            koreanText: source,
            mode: 'editorial',
          });
    expect(prompts).toHaveLength(2);
    for (const prompt of prompts) {
      expect(prompt).toContain('본문');
      for (const literal of ['안내', '중첩', '리터럴', '고정값', '하위']) expect(prompt).not.toContain(literal);
    }
    const expected =
      'Body <code>  안내<span>중첩</span>\n\t리터럴 </code>\n\n<pre>  고정값\n<span>하위</span> </pre>\n\nMore';
    const hash = `document:v1:${createHash('sha256').update(source).digest('hex')}`;
    if ('description' in result) {
      expect(result.description).toBe(expected);
      expect(result.descriptionSourceHash).toBe(hash);
    } else {
      expect(result.translatedText).toBe(expected);
      expect(result.sourceHash).toBe(hash);
    }
  });

  it.each([
    ['Product', 'description'],
    ['Magazine', 'content'],
    ['bundle', 'description'],
  ])('%s %s는 escaped HTML 본문을 두 단계로 번역하고 실제 literal과 목적지를 보존한다', async (entityType, field) => {
    const source =
      '\\<code> **본문** [안내][] \\</code> <code>  고정<span>하위</span>\r\n\t값 </code>\n\n\\<pre> [안내] 본문 \\</pre>\n\n<pre>  보존전용\n<span>리터럴</span> </pre>\n\n[안내]: <https://example.com/docs?x=1&amp;y=2>';
    const expected =
      '\\<code> **Final article** [Final guide][안내] \\</code> <code>  고정<span>하위</span>\r\n\t값 </code>\n\n\\<pre> [Final guide][안내] Final article \\</pre>\n\n<pre>  보존전용\n<span>리터럴</span> </pre>\n\n[안내]: <https://example.com/docs?x=1&amp;y=2>';
    const llm = referenceClient();
    const provider = new LlmTranslationProvider(llm as unknown as LlmClient);
    const result =
      entityType === 'bundle'
        ? (await provider.translateProductBundle({ ...request, description: source })).product
        : await provider.translateSingle({
            entityType,
            entityId: 'escaped-html-entity',
            field,
            koreanText: source,
            mode: 'editorial',
          });
    expect(llm.completion).toHaveBeenCalledTimes(2);
    const writer = llm.completion.mock.calls[0]![1][1].content as string;
    const reviewer = llm.completion.mock.calls[1]![1][1].content as string;
    for (const prompt of [writer, reviewer]) {
      expect(prompt).toContain('본문');
      expect(prompt).toContain('안내');
      for (const literal of ['고정', '하위', '값', '보존전용', '리터럴']) expect(prompt).not.toContain(literal);
    }
    expect(reviewer).toContain('Writer article');
    expect(reviewer).toContain('Writer guide');
    const hash = `document:v1:${createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex')}`;
    if ('description' in result) {
      expect(result.description).toBe(expected);
      expect(result.descriptionSourceHash).toBe(hash);
    } else {
      expect(result.translatedText).toBe(expected);
      expect(result.sourceHash).toBe(hash);
    }
  });

  it('응답을 감싼 ```json 안의 literal fence 값도 잘리지 않고 bundle로 저장한다', async () => {
    const bundle = {
      productId: 'p1',
      name: '이름',
      summary: '요약',
      description: '설명',
      features: [{ id: 'f-1', name: '```펜스 기능명```', summary: '조건' }],
    };
    const llm = {
      getConfig: vi.fn().mockResolvedValue({ model: 'fence-wrap-model' }),
      completion: vi.fn().mockImplementation(async (_model, messages) => {
        const prompt = messages[1].content as string;
        const json = prompt.split('번역할 원본 데이터 (JSON):\n')[1]!.split('\n\n검토할 번역 초안:')[0]!;
        const mapped = json
          .replaceAll('이름', 'Name')
          .replaceAll('요약', 'Summary')
          .replaceAll('설명', 'Description')
          .replaceAll('조건', 'Condition')
          .replaceAll('```펜스 기능명```', '```Fenced feature name```');
        return { content: '```json\n' + mapped + '\n```' };
      }),
    };
    const result = await new LlmTranslationProvider(llm as unknown as LlmClient).translateProductBundle(bundle);
    expect(result.features).toMatchObject([{ id: 'f-1', name: '```Fenced feature name```', summary: 'Condition' }]);
    expect(result.product.name).toBe('Name');
  });
});
