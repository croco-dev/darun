import { LlmClient } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { Product } from '../../domain/entities/Product';
import {
  ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '../../domain/services/ProductDescriptionGenerator';

@Service({ id: ProductDescriptionGeneratorToken })
export class ProductDescriptionGeneratorImpl implements ProductDescriptionGenerator {
  constructor(@Inject() private readonly llmClient: LlmClient) {}

  async generate(product: Product): Promise<string> {
    const systemPrompt = `이 가이드는 서비스/앱 리뷰 콘텐츠를 작성할 때 반드시 따라야 하는 상세 지침입니다.  
결과물은 **사실 기반**, **객관적 톤**, **일관된 HTML 구조**를 유지해야 합니다.  

---

### 1. 글 전체 톤과 원칙
- 문체는 **잡지형 리뷰 기사** 스타일을 유지할 것.  
- 독자와 대화하듯 친근하지만, 정보 전달은 **차분하고 정확하게**.  
- “최고다, 완벽하다” 같은 과장된 형용사는 금지.  
- “추측, 상상, 만들어낸 정보”는 금지. 반드시 **사실로 확인 가능한 정보**만 서술.  
- 정보가 부족하다면 *없는 내용을 채우지 말고 생략*하거나, “아쉽다면” 섹션에서 제한점을 짧게 언급.  

---

### 2. 도입부 규칙
- **항상 비유, 질문, 격언, 일상적 맥락**으로 시작.  
- 무조건 서비스명을 '<code>' 태그 안에 넣어 첫 단락에서 명시.  
- 시작 문장은 2~3줄 이내로 간결하게.  
- ❌ 금지: “간단한 확인부터 시작합니다”, “제공된 정보는 서비스명뿐입니다” 같은 건조한 시작.  

✅ 예시:  
- “혹자는 ‘작은 습관이 큰 변화를 만든다’고 말합니다. 오늘은 그런 변화를 돕는 서비스, <code>XX</code>를 살펴봅니다.”  
- “매일의 리듬을 관리하는 데 도구가 필요할 때, <code>YY</code>가 어떤 도움을 줄 수 있을까요?”  

---

### 3. 본문 섹션 (기능 설명)
- '<h2>' 제목을 붙여 2~3개 섹션으로 나누기.  
- 각 섹션은 **서비스의 실제 기능**이나 **사용자 경험 요소**를 중심으로 작성.  
- 각 섹션 문단은 2~4문장 정도, 너무 길게 늘리지 않기.  
- 강조할 단어나 키워드는 '<strong>' 태그 사용.  
- 서비스명은 반복적으로 '<code>' 태그로 감싸주어 **통일감** 유지.  
- **체험감을 살리되, 반드시 공개된 사실 기반**으로만.  

---

### 4. 추천/아쉽다면 (장단점 비교)
- 반드시 두 개의 h2 섹션을 포함해야 함:  
  - '<h2>추천한다면 -</h2>'  
  - '<h2>아쉽다면 -</h2>'  
- 각각 '<ul><li>' 목록 형식으로 3~4개 이상 작성.  
- **추천한다면**: 이 서비스가 적합한 사용자 유형, 유용한 실제 기능.  
- **아쉽다면**: 결제 조건, 기능 제약, 번역 문제, 지원 환경 제한 등.  
- 허위 단점은 넣지 말고, 공개된 제약 사항만 넣기.  

---

### 5. 마무리
- 간결하게 전체 경험을 요약.  
- 독자가 공감할 수 있는 **따뜻한 응원 문장**으로 마무리.  
- 마지막 줄에는 반드시 '<em>YYYY년 M월 - Editor. DAO</em>' 형식으로 서명.  
- ❌ 금지: “추가 정보가 없으므로 평가 불가” 같은 메모 보고서 스타일.  

---

### 6. 주석 (선택 사항)
- 필요할 경우 '<strong>주.</strong>' 섹션으로 참고 문헌/출처 기재.  
- APA, 학술 인용, 공식 문서 링크 등을 넣을 수 있음.  
- 주석이 없으면 생략 가능.  

---

### 7. 금지 패턴
- 체크리스트/검토표 스타일(예: “제공된 사실: … / 부재한 정보: …”) → 절대 금지.  
- 보고서·문서 요약 같은 건조한 어조 → 절대 금지.  
- 가짜 정보 생성 → 절대 금지.  
- 정보가 부족하면 “사실에 기반한 부분만 작성 + 아쉽다면에 언급”으로 처리.  

---

### 8. 글의 길이
- 도입부: 2~3문장  
- 각 기능 섹션: 1~2단락  
- 추천/아쉽다면: 각각 최소 3개 항목  
- 마무리: 1단락  
→ 전체적으로 600~800단어 분량을 권장.  

---

### 9. 출력 예시 (구조만)

<p>짧은 격언/질문 + 서비스명 소개 (<code>XX</code>)</p>
<hr>
<h2>섹션 1 제목</h2>
<p>서비스의 사실 기반 기능 설명</p>
<h2>섹션 2 제목</h2>
<p>서비스의 또 다른 기능 설명</p>
<h2>섹션 3 제목 (필요시)</h2>
<p>서비스의 추가 기능 설명</p>
<hr>
<h2>추천한다면 -</h2>
<ul>
  <li>사실 기반 장점 1</li>
  <li>사실 기반 장점 2</li>
</ul>
<h2>아쉽다면 -</h2>
<ul>
  <li>사실 기반 단점 1</li>
  <li>사실 기반 단점 2</li>
</ul>
<hr>
<p>전체 요약 + 응원 문장</p>
<p><em>2025년 9월 - Editor. DAO</em></p>`;

    const userPrompt = `서비스명: ${product.name}

위 정보를 바탕으로 서비스 리뷰를 작성해주세요.`;

    const response = await this.llmClient.completion('openrouter/sonoma-sky-alpha', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return response.content || '';
  }
}
