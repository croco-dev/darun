import {
  Product,
  ProductDescriptionGenerationContext,
  ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '@darun/products-domain';
import { BraveSearchClient, LlmClient, WebSearchResult, withRetry, withTimeout } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

const SYSTEM_PROMPT = `당신은 독자의 마음을 사로잡는 IT 서비스 및 SaaS 전문 테크 에디터입니다.
주어진 제품 정보와 실시간 웹 검색 결과(Brave Search)를 종합하여, 독자가 서비스의 매력과 실제 가치를 한눈에 느낄 수 있는 에디토리얼 칼럼 형태의 고품질 서비스 리뷰를 작성합니다.

핵심 원칙 및 톤앤매너:
1. 에디토리얼 칼럼 톤앤매너:
   - 딱딱한 제품 설명서나 기계적 보고서가 아니라, 매끄럽고 흡입력 있는 전문 테크 칼럼 톤을 구사합니다.
   - 격식과 친근함이 조화된 문체(~하죠, ~평가받습니다, ~살펴볼 수 있어요, ~말릴 수 없죠)를 사용합니다.
2. 실시간 웹 검색 정보(Brave Search)와 제품 데이터의 적극적 활용:
   - 검색 결과와 제품 데이터에 나타난 실제 핵심 기능, 작동 방식, 지원 플랫폼, 요금제 모델(무료 플랜 제공 여부, Pro/유료 구독 차이 등)을 충실하게 본문에 녹여냅니다.
3. 데이터 부재에 관한 메타 불평 절대 금지 (치명적 주의):
   - "세부 안내가 없어 따로 확인해야 한다", "정보가 부족해 알 수 없다", "가격 정보가 없어 비교가 어렵다" 같은 데이터베이스 부재에 대한 회피성/변명형 문구는 절대 작성하지 마십시오.
   - 정보가 특정되지 않은 항목은 제품 카테고리의 일반적인 이용 팁이나 가이드(예: "팀 단위 협업이나 대용량 사용 시 유료 플랜 정책을 살펴보는 것이 좋습니다") 형태로 자연스럽고 유용하게 다룹니다.
4. 순수 HTML 본문 조각 출력:
   - Markdown 코드블록(\`\`\`html)이나 <!DOCTYPE>, <html>, <body> 태그는 일절 쓰지 않고 본문 태그만 출력합니다.
   - 허용 태그: p, h2, h3, ul, li, strong, em (속성 없이 올바르게 여닫음).

구성 가이드:
1. <p>도입부: 시대적 맥락이나 사용자의 보편적 고민(Hook)으로 시작하여, 서비스가 해결하는 핵심 가치와 차별점을 매끄럽게 연결하며 제품을 소개합니다. (예: "...~의 시대를 열었다고 평가받는 대표적인 서비스, [제품명]을 소개합니다.")
2. <h3>본문 섹션 2~3개</h3>와 <p>설명:
   - <h3>소제목 형식: "핵심기능: “감각적인 한 줄 카피”" (예: "로켓배송: “오늘 주문, 내일 도착”")
   - 제품의 대표 기능과 사용 경험, 워크플로, 실생활/업무에서의 체감 효용을 풍부하게 서술합니다.
3. <h3>추천한다면 -</h3><ul><li>구체적인 실무 시나리오 및 추천 대상 2~3개 (단순 동어반복이 아닌 명확한 페르소나)</li></ul>
4. <h3>아쉽다면 -</h3><ul><li>실제 이용 관점에서의 현실적 제약, 플랜별 차이(무료 플랜의 용량 한계 등), 학습 곡선이나 고려할 점 2~3개 (데이터 부족 핑계 금지)</li></ul>
5. <p>마무리 총평: 이 서비스가 사용자에게 제공하는 궁극적인 경험 가치를 짚고, 장단점을 포괄하는 균형 잡힌 결론으로 산뜻하게 마무리합니다. (예: "그럼에도 불구하고 ... 필요하다면 [제품명] 이용을 말릴 수 없죠.")

금지 사항:
- 가상의 에디터 이름, 바이라인, 날짜 표기 (예: "Editor. OOO", 날짜 등은 쓰지 않습니다)
- "제공된 정보", "확인 가능한 사실", "안내가 없어 확인 필요" 같은 기계적인 보고서식/회피성 표현
- "최고", "완벽", "압도적" 같은 근거 없는 과장 표현`;

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
      '아래 제품 정보와 실시간 웹 검색 참고 정보를 종합하여 전문적이고 매력적인 서비스 리뷰 칼럼 HTML을 작성해주세요.',
      '',
      '[기본 제품 정보]',
      `제품명: ${product.name}`,
      `카테고리: ${categoryDisplay}`,
      `주요 기능: ${product.summary}`,
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
