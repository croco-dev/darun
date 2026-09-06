import {
  Product,
  ProductDescriptionGenerationContext,
  ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '@darun/products-domain';
import { LlmClient, withRetry } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';

const SYSTEM_PROMPT = `당신은 서비스/앱 리뷰 콘텐츠를 작성하는 전문 에디터입니다.

핵심 원칙:
- 입력된 제품 정보만 사용하고, 확인되지 않은 기능·가격·지원 환경을 만들지 않습니다.
- 친근하지만 객관적인 톤을 유지하고 과장 표현을 피합니다.
- 정보가 부족한 항목은 자연스럽게 생략하거나 제한점으로만 짧게 언급합니다.
- 출력은 HTML 본문만 제공합니다. Markdown, 코드블록, 설명 문구는 쓰지 않습니다.

허용 HTML 태그:
- p, h2, h3, ul, li, strong, em
- 모든 태그는 올바르게 열고 닫고, 속성은 사용하지 않습니다.

구성:
1. <p>도입부: 제품명을 자연스럽게 언급하고 한두 문장으로 맥락을 엽니다.</p>
2. <h3>본문 섹션 2~3개</h3>와 <p>설명</p>: 주요 기능과 사용자 경험을 다룹니다.
3. <h3>추천한다면 -</h3><ul><li>추천 대상 2~3개</li></ul>
4. <h3>아쉽다면 -</h3><ul><li>확인된 제약 또는 정보 부족 1~3개</li></ul>

금지:
- 가상의 에디터 이름, 바이라인, 날짜 표기
- "제공된 정보", "확인 가능한 사실", "정보 부족으로 평가 불가" 같은 보고서식 표현
- "최고", "완벽", "혁신적", "압도적" 같은 과장 표현
- 입력에 없는 가격·기능·카테고리·지원 환경 추정`;

const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'li', 'strong', 'em']);

@Service({ id: ProductDescriptionGeneratorToken })
export class ProductDescriptionGeneratorImpl implements ProductDescriptionGenerator {
  constructor(@Inject(() => LlmClient) private readonly llmClient: LlmClient) {}

  async generate(product: Product, context?: ProductDescriptionGenerationContext): Promise<string> {
    try {
      const response = await withRetry(
        () =>
          this.withTimeout(
            this.llmClient.completion('x-ai/grok-4-fast', [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: this.createUserPrompt(product, context) },
            ]),
            25_000,
            '상품 설명 생성 요청이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.'
          ),
        { maxRetries: 2, baseDelay: 1000, maxDelay: 10000 }
      );

      const content = response.content?.trim();

      if (!content) {
        throw new Error('LLM description response is empty');
      }

      return this.sanitizeHtml(content);
    } catch (error) {
      if (error instanceof Error && error.message.includes('시간 초과')) {
        throw error;
      }
      throw new Error(
        `상품 설명 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  private createUserPrompt(product: Product, context?: ProductDescriptionGenerationContext): string {
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

    return [
      '아래 구조화된 제품 정보만 바탕으로 서비스 리뷰 HTML을 작성해주세요.',
      '',
      `제품명: ${product.name}`,
      `카테고리: ${categoryDisplay}`,
      `주요 기능: ${product.summary}`,
      '가격대: 확인된 정보 없음',
    ].join('\n');
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

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));
    return Promise.race([promise, timeout]);
  }
}
