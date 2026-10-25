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
pnpm typecheck:tsrs # tsrs 추가 타입 검사
pnpm test           # 단위 테스트 실행
```

---

## 3. GraphQL / Lambda 변경 검증

- TypeScript 타입 검사와 번들 생성 성공만으로 GraphQL 서버가 시작된다고 판단하지 않습니다. TypeGraphQL 데코레이터와 스키마 초기화는 JavaScript 모듈을 로드할 때 실패할 수 있습니다.
- `@Field`에서 union, nullable, 배열, enum 등 추론이 불명확한 타입은 반환 타입을 명시합니다. 예: `stage?: string | null`에는 `@Field(() => String, { nullable: true })`를 사용합니다. `nullable` 옵션만으로 GraphQL 타입이 정해지지는 않습니다.
- resolver mock 테스트와 별도로 전체 resolver 목록으로 스키마를 생성하는 테스트를 두고, 배포용 설정으로 만든 Lambda 번들도 별도 Node.js 프로세스에서 로드해 초기화 성공과 `handler` export를 검증합니다. 두 검증은 PR CI와 운영 배포 전 필수 체크로 연결해야 합니다.
- 검증 환경은 운영과 같은 Node.js 22와 `tsconfig.lambda.json`의 decorator metadata 설정을 사용합니다. 운영 자격 증명을 가져오는 대신 검증 전용 환경변수와 유효한 임시 RSA private key를 사용하고, DB 연결이나 실제 Lambda invocation 없이 모듈 초기화를 확인합니다.
- PR CI와 운영 배포 workflow는 `build:lambda` 다음에 `verify:lambda`를 실행합니다. `apps/graphql-api/scripts/verify-lambda-bundle.js`는 유효한 임시 RSA 키와 검증 전용 환경으로 7개 배포 handler를 로드한 뒤, 배포와 같은 metadata·minify 설정의 전체 resolver schema를 생성합니다. codegen 설정이 수집한 libs 및 admin/service/visual 앱의 모든 operation·fragment를 실행 schema와 저장 SDL에 검증하고 두 schema의 일치와 health query를 확인합니다. 검증 프로세스는 네트워크 연결을 차단하며 DB 연결·업무 mutation·worker 실행은 포함하지 않습니다. GraphQL 선언은 canonical 공개 이름을 명시하고, SDL 재생성은 `pnpm --filter graphql-api verify:lambda -- --emit-schema`, 생성 타입 갱신과 실제 codegen validation은 `pnpm --filter @darun/provider-graphql codegen`으로 실행합니다.
- 상품 발행과 발행된 canonical 콘텐츠 변경은 Product-first transaction의 `beginProductContentWrite`에서 revision·검색/번역 intent를 함께 기록합니다. 앱 registrar가 번역 job도 같은 commit에 등록하므로 resolver에서 별도 색인이나 번역을 중복 요청하지 않습니다. LLM 응답은 기다리지 않고 기존 recovery tick과 `PRODUCT_CONTENT_SYNC_QUEUE_URL`·`TRANSLATION_QUEUE_URL` worker가 독립적으로 재처리합니다.

## 4. PostgreSQL migration 변경 검증

- Drizzle TS 스키마 변경은 DB 변경을 적용하지 않습니다. 테이블·컬럼·인덱스 등의 스키마 변경에는 SQL migration과 해당 snapshot / `meta/_journal.json` 변경을 같은 PR에 포함합니다.
- 생성 설정은 `apps/graphql-api/drizzle.config.cjs`, migration 경로는 `apps/graphql-api/scripts/migrations`입니다. 생성 명령은 다음과 같습니다. 생성된 SQL이 의도한 변경만 포함하는지 검토합니다.

  ```bash
  pnpm --filter graphql-api exec drizzle-kit generate --config drizzle.config.cjs
  ```

- PR CI와 운영 배포의 `check:migrations`는 migration 디렉터리를 임시 경로에 복사해 같은 스키마로 SQL을 생성하고, 변경 또는 새 파일이 생기면 실패시킵니다. 원본 migration은 수정하지 않으며, rename / 삭제 확인이 필요한 생성 과정은 자동으로 임의 선택하지 않습니다.
- `drizzle-kit check`는 생성된 migration 이력의 충돌 검사입니다. 스키마 변경에 대한 SQL 생성 누락 검사와 혼동하지 않습니다. 필요하면 격리 PostgreSQL에서 migration 적용 후 변경된 repository의 실제 읽기·쓰기를 검증합니다. 운영 DB를 테스트 대상으로 사용하지 않습니다.
- `.github/workflows/Deploy.yaml`은 배포 전에 `pnpm --filter graphql-api run migrate`를 실행합니다. 이 명령은 이미 생성된 SQL을 적용하며, TS 스키마에서 SQL을 생성하지 않습니다.
- `Pending migrations (0): none`과 migration 성공은 journal에 등록된 migration이 적용됐다는 의미입니다. 필요한 테이블·컬럼이 모두 있다는 증거는 아닙니다. 누락이 의심되면 PR의 SQL / snapshot, 배포 로그, 운영 DB의 `information_schema`와 `drizzle.__drizzle_migrations`를 읽기 전용으로 대조합니다.
- 적용된 migration을 수정해 이력을 바꾸지 않습니다. 후속 migration으로 수정하고, 운영에서 `drizzle-kit push`로 journal을 우회하지 않습니다. 운영 migration 실행과 배포는 해당 작업의 사용자 승인 범위 안에서 수행합니다.

## 5. AWS 운영 장애 조사

- Darun 운영 AWS CLI는 `--profile darun --region ap-northeast-2`를 명시합니다. 기본 프로필이나 다른 프로젝트의 프로필로 실패한 것을 Darun 접근 불가로 판단하지 않습니다.
- 먼저 `aws sts get-caller-identity --profile darun`으로 계정을 확인합니다. 인증 실패와 애플리케이션 장애를 구분하고, 로그나 보고서에 자격 증명·환경변수 값·DB 접속 문자열을 출력하지 않습니다.
- GraphQL Lambda 로그 그룹은 `/aws/lambda/graphql-api` 접두어로 조회합니다. 물리 리소스 이름의 해시는 바뀔 수 있으므로 발견한 현재 이름을 사용합니다.

  ```bash
  aws logs describe-log-groups --profile darun --region ap-northeast-2 \
    --log-group-name-prefix /aws/lambda/graphql-api \
    --query 'logGroups[].logGroupName'
  ```

- 어드민 502 조사 시 페이지 응답과 GraphQL API 응답을 따로 확인합니다. 인증 없는 `query { __typename }` 조회로 API 초기화 경로를 확인하고 HTTP status, 응답 본문, `x-amzn-requestid`, 발생 시각을 기록합니다. 이 조회가 성공해도 DB나 인증 경로가 정상이라고 단정하지 않습니다.
- CloudWatch는 발생 시각 주변의 짧은 구간으로 제한해 조회합니다. 사용자에게는 KST, AWS 로그 조회에는 UTC 또는 epoch milliseconds를 사용합니다. 요청 ID가 없는 모듈 초기화 예외도 있으므로 요청 ID 검색만으로 끝내지 말고 같은 시각·로그 스트림의 `Uncaught Exception`과 `INIT_REPORT`도 확인합니다.
- 오류 원인은 운영 로그로 확정합니다. 브라우저의 `ServerError`나 minified JS 위치만으로 DB·CORS·인증 문제를 단정하지 않습니다. HTTP 502 재현, Lambda 초기화 예외, SQL 실행 오류를 구분해 보고합니다.
- 클라이언트 timeout은 서버 mutation 취소나 DB rollback을 뜻하지 않습니다. 발행 timeout 조사에서는 `published_at`, 번역 저장 시각, Lambda 실행 시간을 읽기 전용으로 대조해 이미 완료된 작업인지 확인합니다.
- 배포 작업 성공과 서비스 정상 동작을 구분합니다. 배포 후에는 읽기 전용 GraphQL smoke check에서 HTTP 200뿐 아니라 GraphQL `errors`가 없는지와 기대한 `data`를 확인합니다. 초기화 smoke check와 DB 기능 검증은 각각 증거를 남깁니다.

---

## 6. 관련 문서

- [CONTRIBUTING.md](file:///Users/owen/Projects/worktree/darun/manatee/CONTRIBUTING.md): 환경 설정, 브랜치 전략, 테스트 커버리지 기준
- `.cursor/rules/`: 클라이언트/서버 아키텍처 및 레이어 분리 규칙
