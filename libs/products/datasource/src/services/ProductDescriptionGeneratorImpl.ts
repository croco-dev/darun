import {
  Product,
  ProductDescriptionGenerationContext,
  ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '@darun/products-domain';
import { BraveSearchClient, LlmClient, WebSearchResult, withRetry, withTimeout } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

const SYSTEM_PROMPT = `당신은 글로벌 테크 프로덕트 및 SaaS 전문 리뷰 에디터입니다.
주어진 제품 정보와 실시간 웹 검색 결과를 종합하여, 사용자가 서비스의 핵심 가치와 활용성을 한눈에 파악할 수 있는 고품질 리뷰 및 소개 콘텐츠를 작성합니다.

핵심 원칙:
- 기본 정보, 등록된 주요 기능, 웹 검색 결과(Brave Search)를 사실에 입각하여 유기적으로 종합합니다.
- 웹 검색 정보가 포함된 경우 실제 활용 사례, 주요 워크플로, 지원 플랫폼, 요금제 특징(무료 체험, 티어별 특징 등)을 충실히 반영합니다.
- 확인되지 않은 정보는 지어내지 않으며, 정보가 부족한 항목은 추측하지 않고 자연스럽게 생략하거나 유의사항으로만 짧게 언급합니다.
- 친근하지만 객관적이고 균형 잡힌 전문 테크 저널리즘 톤을 유지합니다. 과도한 찬사나 상투적인 미사여구는 배제합니다.
- 출력은 순수 HTML 본문 조각만 제공합니다. Markdown, 코드블록(\`\`\`html), 문서 선언(<!DOCTYPE>, <html>, <body>)은 절대 포함하지 마십시오.

허용 HTML 태그:
- p, h2, h3, ul, li, strong, em
- 모든 태그는 올바르게 열고 닫아야 하며, 속성(class, id, style, href 등)은 사용하지 않습니다.

구성:
1. <p>도입부: 제품명을 자연스럽게 언급하며 어떤 문제를 해결하고 어떤 가치를 제공하는지 명확하고 흡입력 있게 시작합니다.</p>
2. <h3>본문 섹션 2~3개</h3>와 <p>설명: 주요 기능, 워크플로, 사용자 경험을 구체적으로 다룹니다. (검색된 정보와 등록된 기능 적극 반영)
3. <h3>추천한다면 -</h3><ul><li>구체적인 추천 대상 및 유용한 시나리오 2~3개</li></ul>
4. <h3>아쉽다면 -</h3><ul><li>확인된 제약 사항, 학습 곡선, 또는 고려할 점 1~3개</li></ul>

금지:
- 가상의 에디터 이름, 바이라인, 날짜 표기
- "제공된 정보", "확인 가능한 사실", "정보 부족으로 평가 불가" 같은 기계적인 보고서식 표현
- "최고", "완벽", "혁신적", "압도적" 같은 과장 표현
- 입력에 없는 가격·기능·카테고리·지원 환경 추정`;

const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'li', 'strong', 'em']);

@Service({ id: ProductDescriptionGeneratorToken })
export class ProductDescriptionGeneratorImpl implements ProductDescriptionGenerator {
  private readonly searchClient: BraveSearchClient;

  constructor(
    @Inject(() => LlmClient) private readonly llmClient: LlmClient,
    searchClient?: BraveSearchClient
  ) {
    this.searchClient = searchClient ?? new BraveSearchClient();
  }

  async generate(product: Product, context?: ProductDescriptionGenerationContext): Promise<string> {
    let searchResults: WebSearchResult[] = context?.searchResults ?? [];

    if (searchResults.length === 0 && this.searchClient) {
      try {
        const categoryHint = context?.categoryLabels?.[0] ? ` ${context.categoryLabels[0]}` : '';
        const query = `${product.name}${categoryHint} software review features`.trim();
        searchResults = await this.searchClient.search(query, { count: 5 });
      } catch (error) {
        console.warn(`[ProductDescriptionGenerator] Web search failed for ${product.name}:`, error);
      }
    }

    try {
      const userPrompt = this.createUserPrompt(product, context, searchResults);

      const response = await withRetry(
        () =>
          withTimeout(
            this.llmClient.completion([
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ]),
            120_000,
            '상품 설명 생성 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.'
          ),
        { maxRetries: 2, baseDelay: 2000, maxDelay: 10000 }
      );

      const content = response.content?.trim();

      if (!content) {
        throw new Error('LLM description response is empty');
      }

      return this.sanitizeHtml(content);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('시간 초과') || error.message.toLowerCase().includes('timeout'))
      ) {
        throw error;
      }
      throw new Error(
        `상품 설명 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  private createUserPrompt(
    product: Product,
    context?: ProductDescriptionGenerationContext,
    searchResults?: WebSearchResult[]
  ): string {
    let categoryDisplay = '확인된 정보 없음';

    if (context?.categoryLabels && context.categoryLabels.length > 0) {
      categoryDisplay = context.categoryLabels.join(', ');
    } else if (product.categoryIds.length > 0) {
      const isMachineId = (id: string) =>
        /^(?:c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(id);
      const validLabels = product.categoryIds.filter(id => !isMachineId(id));
      if (validLabels.length > 0) {
        categoryDisplay = validLabels.join(', ');
      }
    }

    const lines = [
      '아래 구조화된 제품 정보와 웹 검색 참고 정보를 바탕으로 서비스 리뷰 HTML을 작성해주세요.',
      '',
      `제품명: ${product.name}`,
      `카테고리: ${categoryDisplay}`,
      `주요 기능: ${product.summary}`,
      '가격대: 확인된 정보 없음',
    ];

    if (context?.features && context.features.length > 0) {
      lines.push('');
      lines.push('[등록된 주요 기능]');
      for (const feature of context.features) {
        if (feature.summary) {
          lines.push(`- ${feature.name}: ${feature.summary}`);
        } else {
          lines.push(`- ${feature.name}`);
        }
      }
    }

    if (context?.links && context.links.length > 0) {
      lines.push('');
      lines.push('[공식 링크]');
      for (const link of context.links) {
        lines.push(`- ${link.title}: ${link.link}`);
      }
    }

    const effectiveSearchResults = searchResults ?? context?.searchResults;
    if (effectiveSearchResults && effectiveSearchResults.length > 0) {
      lines.push('');
      lines.push('[실시간 웹 검색 참고 정보 (Brave Search)]');
      for (const result of effectiveSearchResults) {
        lines.push(`- 제목: ${result.title}`);
        lines.push(`  출처: ${result.url}`);
        lines.push(`  내용: ${result.description}`);
        if (result.extraSnippets && result.extraSnippets.length > 0) {
          lines.push(`  추가 내용: ${result.extraSnippets.join(' / ')}`);
        }
      }
    }

    return lines.join('\n');
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, rawTagName: string) => {
        const tagName = rawTagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tagName)) {
          return '';
        }

        return tag.startsWith('</') ? `</${tagName}>` : `<${tagName}>`;
      })
      .trim();
  }
}
