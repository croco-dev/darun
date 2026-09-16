# AGENTS.md

이 문서는 Darun 모노레포에서 작업하는 AI 에이전트를 위한 가이드라인 및 주의사항을 정리한 문서입니다.

---

## 1. 다국어(i18n) 및 ICU MessageFormat 작성 가이드

`apps/service-web`에서는 다국어 지원을 위해 `next-intl`을 사용하고 있으며, 메시지 포맷은 **ICU MessageFormat** 문법을 따릅니다.

### ⚠️ 작은따옴표(`'`) 이스케이프 주의 (치명적 버그 방지)

ICU MessageFormat에서 **ASCII 작은따옴표(`'`)는 중괄호(`{}`)와 같은 특수 문자를 리터럴로 이스케이프(탈출)하기 위한 예약어**입니다.

- **잘못된 예시 (버그 발생)**:
  ```json
  // '{query}'로 감싸면 중괄호가 escape되어 변수가 치환되지 않고 literal "{query}"로 출력됨
  "resultTitle": "'{query}' search results"
  // 출력 결과: {query} search results
  ```

- **올바른 예시**:
  1. **곡선 따옴표 사용 (프로젝트 권장)**:
     ```json
     "resultTitle": "‘{query}’ search results"
     // 출력 결과: ‘toss’ search results
     ```
  2. **ASCII 작은따옴표를 반드시 출력해야 하는 경우 (`''` 사용)**:
     ```json
     "resultTitle": "''{query}'' search results"
     // 출력 결과: 'toss' search results
     ```

### ⚠️ 따옴표 짝(Pair) 일치

여는 따옴표와 닫는 따옴표의 문자 코드가 불일치하지 않도록 주의합니다.
- 잘못된 예: `"No results found for ‘{query}'."` (여는 따옴표는 `‘` U+2018, 닫는 따옴표는 `'` U+0027)
- 올바른 예: `"No results found for ‘{query}’."` (여는 따옴표 `‘`, 닫는 따옴표 `’`)

### 🔍 번역 파일 수정 시 에이전트 체크리스트

1. `messages/*.json` 파일에 `{placeholder}` 형태의 동적 변수를 추가/수정할 때, 주변에 단일 ASCII 작은따옴표(`'`)가 포함되어 있는지 반드시 확인합니다.
2. 한국어(`ko.json`)와 영어(`en.json`)의 변수명(`{query}`, `{name}` 등)이 서로 일치하는지 확인합니다.
3. 수정 후 필요 시 `use-intl/core`의 `createTranslator`를 이용해 실제 치환 결과를 스크립트나 단위 테스트로 검증합니다.

---

## 2. 코드 품질 및 검증 규칙

작업 완료 전 다음 명령어를 실행하여 검증을 통과해야 합니다.

```bash
pnpm lint           # ESLint + Prettier 검사
pnpm typecheck      # TypeScript 타입 검사
pnpm test           # 단위 테스트 실행
```

---

## 3. 관련 문서

- [CONTRIBUTING.md](file:///Users/owen/Projects/worktree/darun/manatee/CONTRIBUTING.md): 환경 설정, 브랜치 전략, 테스트 커버리지 기준
- `.cursor/rules/`: 클라이언트/서버 아키텍처 및 레이어 분리 규칙
