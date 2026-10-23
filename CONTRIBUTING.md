# Contributing to darun.io

## 환경 설정

### 사전 요구사항

- Node.js `>= 22`
- pnpm `>= 10`

### 의존성 설치

```bash
pnpm install
```

`pnpm install`은 Lefthook git hook도 자동으로 설치합니다 (`prepare` 스크립트).

### 환경 변수

각 앱 디렉토리에 `.env.sample`을 복사해 실제 값을 채웁니다.

```bash
cp apps/graphql-api/.env.sample apps/graphql-api/.env
cp apps/service-web/.env.sample apps/service-web/.env.local
cp apps/admin-web/.env.sample apps/admin-web/.env.local
cp apps/visual-web/.env.sample apps/visual-web/.env.local
```

#### `apps/graphql-api`

| 변수 | 설명 | 필수 |
| --- | --- | --- |
| `INFRA_ENV` | 인프라 환경 식별자 (`local` 또는 `prod`) | 필수 |
| `RUNNING_ENV` | 런타임 환경 식별자. Sentry 환경 이름과 Cloudinary 폴더 prefix에 영향을 줍니다. 실제 운영 환경에서는 반드시 `prod`로 설정해야 합니다 | 필수 |
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Drizzle ORM) | 필수 |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 필수 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK 비공개 키 | 필수 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK 클라이언트 이메일 | 필수 |
| `MONGODB_URI` | MongoDB 연결 문자열 (Mongoose) | 필수 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary 클라우드 이름 | 필수 |
| `CLOUDINARY_API_KEY` | Cloudinary API 키 | 필수 |
| `CLOUDINARY_API_SECRET` | Cloudinary API 시크릿 | 필수 |
| `SENTRY_AUTH_TOKEN` | Sentry 소스맵 업로드 토큰 | 선택 |
| `OPEN_ROUTER_API_KEY` | OpenRouter AI API 키 | 선택 |
| `VOTE_IP_SALT` | IP 기반 투표 중복 방지를 위한 해시 salt | 필수 |

#### `apps/service-web`

| 변수 | 설명 | 필수 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 API 키 | 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 필수 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | 필수 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK 클라이언트 이메일 | 필수 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK 비공개 키 | 필수 |
| `NEXT_PUBLIC_GRAPHQL_URL` | 브라우저용 GraphQL API 엔드포인트 URL | 필수 |
| `GRAPHQL_INTERNAL_URL` | SSR/서버 사이드용 내부 컨테이너 GraphQL API URL (Docker Compose 환경에서 사용) | 선택 |
| `NEXT_PUBLIC_BASE_URL` | 서비스 베이스 URL | 필수 |
| `NEXT_PUBLIC_INFRA_ENV` | 인프라 환경 식별자 (`local` 설정 시 Firebase emulator 연동) | 선택 |
| `FIREBASE_AUTH_EMULATOR_HOST` | Firebase Auth 에뮬레이터 호스트 주소 (`localhost:9099`) | 선택 |
| `SENTRY_AUTH_TOKEN` | Sentry 소스맵 업로드 토큰 | 선택 |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog 프로젝트 API 키 | 선택 |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog 호스트 URL | 선택 |

#### `apps/admin-web`

| 변수 | 설명 | 필수 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 API 키 | 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 필수 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | 필수 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK 클라이언트 이메일 | 필수 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK 비공개 키 | 필수 |
| `NEXT_PUBLIC_GRAPHQL_URL` | 브라우저용 GraphQL API 엔드포인트 URL | 필수 |
| `GRAPHQL_INTERNAL_URL` | SSR/서버 사이드용 내부 컨테이너 GraphQL API URL (Docker Compose 환경에서 사용) | 선택 |
| `NEXT_PUBLIC_INFRA_ENV` | 인프라 환경 식별자 (`local` 설정 시 Firebase emulator 연동) | 선택 |
| `FIREBASE_AUTH_EMULATOR_HOST` | Firebase Auth 에뮬레이터 호스트 주소 (`localhost:9099`) | 선택 |

Cloudinary 이미지 업로드 요청은 서버가 서명한 `folder`, `timestamp`, `public_id`와 동일한 값을 전송해야 합니다. 공유 `useImageUpload`의 `displayName`은 서명 입력과 업로드 요청의 `public_id`에 함께 사용하며, 이를 누락하거나 변경하면 `Invalid Signature` 오류가 발생합니다.

LLM 모델 조회는 Firebase 토큰으로 확인된 관리자만 `POST /api/llm/models`의 JSON 본문 `{endpoint?, apiKey?}`로 요청합니다. 인증된 GET은 `405`와 `Allow: POST`를 반환하며 키를 query에 넣지 않습니다. 공개 HTTPS 호스트와 기본 443 포트만 허용하고, 전체 DNS 결과를 검증한 뒤 연결 주소를 고정합니다. 내부 주소·IP literal·credential/query/fragment·redirect는 허용하지 않습니다. 요청 JSON은 16KiB, 공급자 응답은 2MiB, DNS부터 응답 종료까지는 10초로 제한합니다. 프록시 실패 시 브라우저에서 공급자로 직접 재요청하지 않습니다. 모델의 구조화 응답 표시는 공급자 메타데이터에 따른 힌트이며 Darun schema 검증 결과가 아닙니다.

브라우저에서 LLM 모델 기본값과 타입은 `@darun/utils-llm/model`에서 가져옵니다. 패키지 루트는 Node.js `AsyncLocalStorage`를 사용하는 서버용 LLM 클라이언트를 포함하므로 클라이언트 컴포넌트에서 참조하지 않습니다.

`OPEN_ROUTER_API_KEY`는 정규화된 base가 정확히 `https://openrouter.ai/api/v1`인 경우에만 fallback으로 사용됩니다. 커스텀 엔드포인트에는 별도의 입력·저장 키만 사용하며, 모델 목록은 키 없이 공개 조회할 수 있지만 completion에는 키가 필요합니다. 커스텀 요청에 환경 기본 키와 같은 키를 명시해도 전송을 거절합니다. 정상 DB row 부재에서만 환경 기본 구성을 사용하고, 조회 장애는 retryable `LLM_CONFIG_READ_FAILED`로 전달합니다. 저장 장애는 SQL·parameter·cause 원문 없이 `LLM_SETTING_SAVE_FAILED`로 전파하며 성공으로 처리하지 않습니다. 환경 키는 관리자 설정 응답이나 최초 저장값으로 복사하지 않습니다. 엔드포인트 변경 시 새 키 입력이 없으면 기존 공급자 키를 비우고, 같은 엔드포인트에서 입력을 생략하면 저장 키만 유지합니다. GraphQL의 기존 Sentry 오류 이벤트는 `apiKey`·`braveApiKey` 인자를 문서에서 식별해 query·variables·exception extras에서 원문을 제거합니다. 변수 이름·field alias·inline literal·변수 기본값과 같은 요청의 다른 field 오류에도 적용합니다. 키 변수가 배열·객체이면 중첩 property 이름과 문자열 값, GraphQL 오류의 escaped 표현과 구조화 이벤트의 property 이름도 제거하며, scalar coercion의 `BAD_USER_INPUT`·HTTP 400 거절과 resolver/설정 저장 미실행은 그대로 유지합니다. 개행이 있는 property 이름을 SDK가 가짜 stack frame으로 분해하기 전에 telemetry용 오류 사본의 stack을 정제하며 공개 GraphQL 오류는 바꾸지 않습니다. Lambda와 로컬 서버가 함께 사용하는 Sentry 초기화는 공통 `beforeSend`·`beforeSendTransaction` 정책을 등록합니다. 오류별 임시 scope에 의존하지 않고 HTTP/RequestData가 붙인 원문 본문·query string과 SDK 내부 요청 사본을 제거하며, 전체 batch에서 식별한 키의 원문·JSON escaped·URI 인코딩 사본을 송신 직전에 정제합니다. 따라서 오류 없는 정상 저장의 실제 HTTP transaction/span과 같은 POST batch의 다른 operation 오류도 보호합니다. GraphQL GET mutation은 기존 `405`·`Allow: POST`로 거절하고 설정을 저장하지 않으며, 변수·inline·기본값 키가 든 percent-encoded URL/query와 span의 URL/target 사본도 송신하지 않습니다. HTTP batching은 유지하며 비민감 operation·path·오류 code/message/stack과 HTTP method·URL 경로·header·trace 진단은 보존합니다. production DSN·tracesSampleRate 0.1·profiling과 기본 integrations는 변경하지 않습니다. GraphQL 오류 로그와 기본 Console breadcrumb은 원문 message를 제외한 code·path·locations·실제 호출 위치만 남깁니다. 전체 message의 경계를 확인한 뒤 stack frame을 읽으므로 property 이름의 개행이나 `at ... (marker)` 가짜 frame이 앞선 Console breadcrumb를 통해 다른 batch operation에 전달되지 않습니다. Node 22 로컬 회귀는 격리 fork의 임시 HTTP port에서 실제 JSON middleware·Apollo plugin·설정 resolver/service·기본 Sentry Console/HTTP/RequestData와 ContextLines integration 및 incoming HTTP tracing을 연결하고 변수·inline·기본값 키와 batch 순서 반전, 두 키 각각의 배열·객체·중첩/escape 변수와 credential-keyed map·개행/가짜 frame/escaped property 거절을 단건·batch 양방향 순서로 검증합니다. GET의 form·percent·전체 byte 인코딩과 `+ / =` 예약문자는 실제 URL search로 Apollo에 전달합니다. fixture 키는 런타임에 생성해 소스 context의 합성 상수와 실제 credential 노출을 혼동하지 않으며 Node 22가 아니면 명시적으로 실패합니다. 설정 오류의 실제 Console 수집이 끝난 뒤 같은 batch의 비민감 오류를 발생시키고, 늦은 SDK 이벤트에 안전한 code·존재하는 path/실제 호출 위치를 담은 실제 console breadcrumb와 SDK 정규화된 `data.arguments`가 있는지 확인한 다음 키 원문·escaped 사본의 부재를 검사합니다. 요청 전 breadcrumb를 비워 이전 요청의 로그로 통과하지 않게 하며, 단건 오류는 SDK capture 뒤의 자기 로그가 같은 이벤트에 있다고 가정하지 않고 실제 logger 인자를 검사합니다. plugin 단위 회귀의 `beforeSend` 관찰·`null` 차단은 유지하고, HTTP 회귀는 같은 공통 송신 정책을 거친 실제 error/transaction envelope 전체를 로컬 in-memory capture transport에서 수집합니다. fixture에서만 sampling을 1로 고정하며 정상 저장의 실제 `http.server` transaction 존재와 원문·복원 가능한 URI 인코딩 사본의 부재를 필수 단언합니다: `pnpm --filter graphql-api exec vitest run __tests__/llmSettingTelemetry.test.ts __tests__/llmSettingHttpTelemetry.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism`. 합성 DSN과 로컬 transport로 실제 Sentry·공급자 송신을 막으며 DB·브라우저는 사용하지 않습니다.

거절된 키 객체의 `type`·`id` 같은 property 이름은 오류 message·extra·Console 인자처럼 사용자 입력을 담은 사본에서만 정제하며, 구조화 입력 bag에서는 property 이름 전체가 일치하는 key만 치환해 `providerCredential` 같은 비민감 변수명을 보존합니다. 이 전체 key 비교는 percent hex 대소문자만 동등하게 취급하고 실제 문자의 대소문자는 구분합니다. 실제 secret 값과 그 JSON·URI 표현은 입력 bag key의 일부로 들어가도 제거합니다. scalar 검증에서 거절되는 inline 객체·배열과 참조된 변수 기본값의 객체·배열도 runtime 변수와 같이 중첩 문자열·property 이름을 수집해 보호하며, 중복 ObjectField의 앞선 문자열과 inline 객체·배열 내부 Variable이 참조하는 runtime 값·기본값도 같은 수집에 포함합니다. Sentry의 고정 필드 이름과 event/transaction/span ID·종류, HTTP header 이름과 ContextLines의 실제 소스 문맥은 사용자 property처럼 치환하지 않습니다. `contexts.trace.data`·`spans[].data`의 고정 `http.method`·`http.target`·`http.url`·`http.route` 문자열은 거절 property 이름이 `POST`·`graphql`이어도 비민감 method/path를 보존하되, 실제 secret 값과 그 JSON·URI 표현은 제거합니다. 이 중 `http.target`·`http.url`의 search·fragment는 query 파라미터의 이름이나 존재 여부와 무관하게 먼저 제거하고, 비민감 scheme·host·path 진단은 보존합니다. 다른 span data와 `http.request.header.*` 값은 계속 입력으로 정제합니다. `event.request`와 SDK 내부 `normalizedRequest`의 header 값 및 cookie 이름·값은 입력으로 정제하며, 입력 key가 `type`·`event_id`·`trace_id`·`span_id`·`parent_span_id`여도 실제 protocol identity 위치 밖에서는 값 정제를 건너뛰지 않습니다. `x-transaction-id`에서 파생된 오류의 transaction 이름도 입력 사본으로 정제하며, 비민감 이름과 실제 incoming HTTP transaction의 method/path는 보존합니다. 실제 incoming transaction의 이름은 SDK가 요청 줄에서 만들어 이 header와 우연히 같은 문자열이어도 route 진단으로 보존하는데, `contexts.trace.op`이 `http.server`인 transaction 이름에만 이 구분을 적용하고 같은 protocol 경로의 이름에 실제 secret 값이 들어가면 계속 제거하며, trace op 없는 transaction 이름은 기존 header 사본 정책을 따릅니다. Apollo 오류 processor와 batch 전체 credential을 수집하는 최종 송신 hook에 같은 정책을 적용합니다. SDK가 cookie 이름을 소문자로 바꾸고 하이픈을 밑줄로 치환한 사본도 `contexts.trace.data`·`spans[].data`의 `http.request.header.cookie.`·`http.request.header.set_cookie.` suffix에서 제거하며, 이 표현 비교를 일반 secret 값이나 입력 bag key로 확장하지 않습니다. descriptor로 복사한 lazy stack accessor는 오류 사본에서 `undefined`가 되어 SDK 송신 전부터 frames가 사라질 수 있으므로, telemetry 오류 사본은 stack 문자열을 own data property로 지정해 진단을 보존하고 공개 오류는 그대로 둡니다. 두 telemetry suite의 `type`/`id` 객체·실제 envelope/trace ID 양성 검사와 SDK 송신 전후 stack 비교는 위 격리 명령으로 실행합니다.

#### `apps/visual-web`

| 변수 | 설명 | 필수 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 API 키 | 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 필수 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | 필수 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK 클라이언트 이메일 | 필수 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK 비공개 키 | 필수 |
| `NEXT_PUBLIC_GRAPHQL_URL` | 브라우저용 GraphQL API 엔드포인트 URL | 필수 |
| `GRAPHQL_INTERNAL_URL` | SSR/서버 사이드용 내부 컨테이너 GraphQL API URL (Docker Compose 환경에서 사용) | 선택 |
| `NEXT_PUBLIC_BASE_URL` | 서비스 베이스 URL | 필수 |
| `NEXT_PUBLIC_INFRA_ENV` | 인프라 환경 식별자 (`local` 설정 시 Firebase emulator 연동) | 선택 |
| `FIREBASE_AUTH_EMULATOR_HOST` | Firebase Auth 에뮬레이터 호스트 주소 (`localhost:9099`) | 선택 |
| `SENTRY_AUTH_TOKEN` | Sentry 소스맵 업로드 토큰 | 선택 |

## 개발 서버 실행

전체 워크스페이스를 함께 실행합니다.

```bash
pnpm dev
```

앱별로 실행하려면 필터를 사용합니다.

```bash
pnpm --filter graphql-api dev   # http://localhost:4000
pnpm --filter service-web dev   # http://localhost:3000
pnpm --filter admin-web dev     # http://localhost:3001
pnpm --filter visual-web dev    # http://localhost:3002
```

## 로컬 개발 환경 (Docker Compose)

Docker Compose로 웹 애플리케이션과 데이터베이스, 에뮬레이터 같은 인프라 서비스를 컨테이너 환경에서 실행할 수 있습니다.

### 사전 요구사항

- Docker 및 Docker Compose
- pnpm `>= 10`

### 실행 순서

1. **환경 변수 파일 생성**:
   각 앱 디렉토리 아래에 있는 `.env.sample`을 `.env.local`로 복사합니다.
   ```bash
   cp apps/graphql-api/.env.sample apps/graphql-api/.env.local
   cp apps/service-web/.env.sample apps/service-web/.env.local
   cp apps/admin-web/.env.sample apps/admin-web/.env.local
   cp apps/visual-web/.env.sample apps/visual-web/.env.local
   ```

2. **서비스 실행**:
   `pnpm local:up` 명령으로 모든 컨테이너를 백그라운드에서 실행합니다.
   ```bash
   pnpm local:up
   ```
   실행되는 서비스와 로컬 포트는 다음과 같습니다.
   - `postgres`: 5432 (PostgreSQL)
   - `mongo`: 27017 (MongoDB)
   - `firebase-auth`: 9099 (Firebase Auth 에뮬레이터)
   - `graphql-api`: 4000 (GraphQL API 서버)
   - `service-web`: 3000 (사용자 서비스 웹)
   - `admin-web`: 3001 (어드민 웹)
   - `visual-web`: 3002 (비주얼 웹)

3. **데이터베이스 초기화**:
   `pnpm local:bootstrap` 명령을 실행해서 PostgreSQL 데이터베이스 스키마를 초기화(Drizzle 마이그레이션 적용)합니다.
   ```bash
   pnpm local:bootstrap
   ```

4. **접속 확인**:
   브라우저로 아래 주소에 접속해서 정상 작동하는지 확인합니다.
   - 사용자 웹: http://localhost:3000
   - 어드민 웹: http://localhost:3001
   - 비주얼 웹: http://localhost:3002
   - GraphQL API: http://localhost:4000/graphql

5. **테스트**:
   - 단위 테스트 실행: `pnpm test`
   - E2E 테스트 실행: `pnpm --filter service-web e2e`

### 로그 확인 및 서비스 종료

- 컨테이너 로그 확인: `pnpm local:logs`
- 컨테이너 종료 및 삭제: `pnpm local:down`

## 프로덕션 배포

기능 개발이나 버그 수정을 완료하면 다음 흐름을 거쳐 프로덕션 환경에 배포합니다.

1. **코드 병합**:
   작업 브랜치에서 개발을 마치면 `trunk` 브랜치로 squash merge합니다.

2. **자동 품질 검사 (품질 게이트)**:
   `trunk` 브랜치에 병합되거나 코드가 푸시되면 GitHub Actions가 품질 검사를 실행합니다.
   검사 순서: `lint` → `typecheck` → `test`
   GraphQL 변경은 TypeGraphQL 선언에 canonical 공개 타입 이름을 명시해 번들러의 클래스명 변경이 API 이름에 반영되지 않게 합니다. Node.js 22에서 `pnpm --filter graphql-api build:lambda` 다음 `pnpm --filter graphql-api verify:lambda`를 실행합니다. 검증은 임시 RSA·검증 전용 환경과 네트워크 연결 차단 아래 6개 배포 handler를 초기화하고, 배포와 같은 decorator metadata·minify 설정의 전체 resolver schema와 저장 SDL이 일치하는지 확인합니다. codegen 설정이 수집하는 libs 및 admin/service/visual 앱의 모든 operation·fragment를 두 schema에 검증한 뒤 health query만 실행하며, DB 연결·업무 mutation·worker 실행은 하지 않습니다. 문서는 앱 모듈을 실행하지 않고 정적으로 추출하며, 일치하는 파일의 문서 파싱 오류도 생략하지 않고 실패로 처리합니다. SDL 갱신이 필요하면 `pnpm --filter graphql-api verify:lambda -- --emit-schema`로 생성하고 `pnpm --filter @darun/provider-graphql codegen`으로 저장 SDL의 실제 문서 검증과 생성 타입 갱신을 완료합니다.

3. **배포 실행**:
   품질 검사를 모두 통과하면 백엔드 리소스가 자동으로 배포됩니다.
   배포 명령: `sst deploy --stage prod`
   이때 `RUNNING_ENV=prod` 값은 Sentry 환경 분류와 Cloudinary 업로드 폴더 규칙에 영향을 주므로 그대로 유지해야 합니다.

## 비동기 작업 복구

SST의 `JobRecoveryTick`은 `CronV2`로 매분 번역·AI 소개·리서치·상품 콘텐츠 동기화 작업의 복구 handler를 실행하며, 네 작업 큐에 대한 `sqs:SendMessage` 권한과 큐 URL을 전달합니다. 배포 출력의 `jobRecoveryScheduleArn` ARN으로 생성된 스케줄을 확인할 수 있습니다. 번역 결과는 작업 행을 잠근 뒤 lease를 다시 확인한 같은 트랜잭션에서만 저장합니다. 동일 대상·종류·언어의 활성 번역 작업은 중복 생성하지 않으며, 번역·소개 작업은 logical job별로 최대 5회 시도합니다. 수동 재시도는 실패한 작업 이력을 보존하고 `retryOfJobId`로 연결한 새 logical job을 만듭니다.

격리 PostgreSQL 주소를 `W4_DATABASE_URL`에 지정하고 `W4_PG=1 pnpm --filter @darun/products-datasource exec vitest run src/__tests__/W4JobLeaseRecovery.pg.test.ts`로 lease 소유권과 만료된 실행의 확정 쓰기 거절을 검증합니다. 운영 DB를 이 회귀 검증에 사용하지 않습니다. 공개 GraphQL mutation 이름은 유지하며 내부 소개 생성 호환 alias는 사용하지 않습니다.
## AI 소개 후보의 근거와 출력 계약

소개 생성은 Writer/Reviewer 두 번의 구조화 응답을 검증합니다. 각 backed text는 `text`, `evidenceRefs`, `bullets`, `quote`, `link`를 모두 요구하며 미사용 값은 `[]`, `false`, `null`입니다. 새 생성은 직접 인용을 입증할 근거 계약이 없어 `quote:true`를 거절합니다. 기존 blockquote와 저장된 후보 HTML은 그대로 유지하며, schema·근거 ID 존재·LLM reviewer 결과를 사실성 인증으로 표시하지 않습니다. 근거가 적으면 짧은 소개와 빈 추천 목록을 허용합니다.

`pnpm eval:llm-content`는 기본 또는 `--mode=deterministic`에서 키가 있어도 원격 호출 0회이며 실제 모델 미실행을 명시합니다. `--mode=manual-live`만 승인된 합성 fixture로 기존 소개 Writer/Reviewer와 실제 TranslationProvider를 실행하고, 키가 없으면 SKIPPED로 보고합니다. 소개는 같은 문서 validator를 쓰되 모든 Feature 언급을 강제하지 않습니다. HRV·불확실성·비판·가격·브랜드/URL·HTML/Markdown·sparse/rich·injection·same-host 번역은 원문, 최종 번역, model/version, 형식 실패를 함께 출력해 사람이 비교합니다. 형식 통과나 근거 ID 존재는 의미 합격이 아니며 golden 영어 문장, 운영 데이터, telemetry, LLM judge는 사용하지 않습니다. 로컬 transport 스텁으로 실제 Provider와 보고 출력을 검증하려면 `pnpm exec tsx --test scripts/eval-llm-content/run.test.ts`를 실행합니다.

생성 snapshot은 PostgreSQL의 fresh transaction 조회와 하나의 순수 projector를 사용합니다. 선택된 8종 근거의 전체 LLM 입력(링크 `displayText` 포함)을 v2로 해시하고 `evidence_hash_version`에 저장합니다. 근거 조회 오류는 retryable `EVIDENCE_READ_FAILED`이며 정상 빈 근거로 처리하지 않습니다. 미적용 legacy 후보는 현재 선택 링크가 없고 v1 전체 hash와 본문 base hash가 일치할 때만 적용합니다. 링크가 있거나 hash/version을 확인할 수 없으면 `STALE_CANDIDATE`로 거절하고 다시 생성해야 합니다. 과거 applied 후보는 현재 본문을 다시 쓰거나 재해시하지 않고 과거 적용 사실만 반환합니다.

후보 적용은 Product 행을 먼저 잠근 뒤 job을 다시 읽어 잠그고, 같은 PostgreSQL transaction에서 fresh projector의 hash를 비교해 저장된 `candidateHtml`과 `appliedAt`을 기록합니다. Product/Feature/Tag/Link/Screenshot/Flow 및 step 변경과 `seed:categories`의 Product 갱신은 공통 Product mutex를 사용합니다. 공통 mutex는 Product 행 잠금 전에 transaction-scoped Category membership advisory gate를 공유 모드로 획득하고, Category 수정은 같은 gate를 독점 모드로 획득한 뒤 owner 집합을 확정합니다. 새 Product 삽입도 공유 gate를 사용하며 Research 등록은 기존 job 행 잠금 다음, Category 공유 read와 Product 삽입 전에 진입합니다. 따라서 미commit 연결·해제는 Category 수정과 직렬화되고, 행 잠금은 기존 Product-first → Category 순서와 Category 근거의 공유 잠금을 유지합니다. Category label 변경은 확정된 모든 owner의 fresh before/after·revision·검색 intent와 한 번에 commit하며 어느 checkpoint가 실패해도 함께 rollback합니다. timestamp-only/no-op은 revision을 만들지 않고 Category-only 변경은 기존 번역 intent·job·영어와 provenance를 보존합니다. `STALE_CANDIDATE`는 GraphQL `errors.extensions.code`로 전달하고, `alreadyApplied: true`는 현재 본문이 아닌 과거 적용 사실입니다. 이미 적용한 후보는 본문·상태·후보 HTML이 이후 바뀌어도 다시 적용하거나 후처리하지 않습니다. 발행된 내용의 실제 변경은 같은 transaction에서 revision과 독립 검색·번역 intent를 기록합니다.

관리자는 `/products/{slug}?descriptionJobId={jobId}` 또는 LLM 작업 목록의 후보 링크로 저장된 소개 HTML을 다시 열 수 있습니다. 다른 Product의 후보는 거절하며, 3분 polling 종료는 작업 실패가 아니라 화면 대기 종료입니다. 재조회 중에도 새 소개 생성을 시작할 수 있고, 새 생성이나 주소의 후보 ID 제거·변경 또는 다른 제품으로 이동하면 이전 조회의 대기 상태를 해제합니다. 이전 조회의 늦은 응답·오류·종료 처리는 현재 후보와 새 조회의 대기 상태를 바꾸지 않습니다. 생성 중에 외부에서 후보 주소(ID 변경·제거, 다른 제품)를 선택하면 진행 중 생성의 화면 쓰기 권한과 생성 대기가 함께 종료되고 현재 주소로 재진입 조회를 시작합니다. mutation 응답 전에는 생성 시작 시점의 후보 주소를 기준으로 외부 전환을 판단하므로, 시작 주소의 후보 ID 제거도 즉시 생성 대기를 종료합니다. 생성 자신이 수락한 job을 `onJobChange`로 반영한 주소는 외부 전환과 구분해 정상 생성이 화면을 계속 담당하며, 권한이 종료된 생성의 늦은 mutation·polling·timeout·종료 처리는 현재 주소·후보/preview·입력·알림·대기 상태를 바꾸지 않습니다. 서버의 생성 job을 취소·삭제하지 않습니다. 생성 완료·실패·화면 대기 종료 또는 조회 오류 후에는 기존 후보 작업 ID 입력과 ‘후보 다시 열기’로 수동 복구할 수 있으며 조회 실패는 입력한 ID를 지우지 않습니다. 생성이 자기 주소를 반영해 주소 effect의 cleanup이 없는 경우에도 unmount는 이후 수동 재조회의 화면 권한을 종료합니다. Apollo의 unmount abort와 후착 성공·network/GraphQL 오류·종료 처리는 떠난 화면의 후보/preview·입력·알림·주소 callback·후속 조회나 재방문한 화면의 대기를 바꾸지 않으며, 같은 slug와 후보 ID로 돌아와도 옛 권한은 복원되지 않습니다. Apply 대기 중 외부 후보 주소 선택·ID 제거·제품 전환·수동 후보 다시 열기·unmount는 이전 Apply의 화면 후처리 권한과 대기를 종료합니다. 같은 ID로 다시 방문해도 이전 실행의 권한은 복원되지 않으며, 후착 성공·과거 적용 응답·실패·종료 처리는 현재 후보의 저장 HTML/Apply 대상·preview·입력·오류/알림·새 조회와 Apply 대기를 바꾸지 않습니다. 이 화면 권한 종료는 서버에서 진행한 원자 Apply나 적용 이력을 취소·삭제하지 않습니다. 과거 적용 후보의 `alreadyApplied`는 이후 사람 편집을 덮어쓰지 않았다는 뜻이며 `STALE_CANDIDATE`는 메시지 문자열이 아닌 오류 코드로 구분합니다. failed job 재시도는 새 logical job ID의 제품 주소로 이동합니다. TipTap 저장 실패는 입력과 열린 편집창을 유지하며 HTML round-trip은 h2·list·link·blockquote·text의 의미와 href로 검증합니다. 소비 문서에 쓰인 `EditProductInput`, `GenerateProductDescriptionInput`, `IndexProductInput`, `Product`, `Link`는 명시 GraphQL 이름을 사용해 번들 class suffix에 흔들리지 않게 합니다.

LLM 목록의 후보 링크와 실패 소개 job의 새 logical retry 이동은 job의 `productId`가 가리키는 Product의 현재 slug를 사용합니다. 단건·목록·retry 응답의 주소 조회는 Product repository의 요청 간 DataLoader cache를 우회하므로, 같은 warm reader라도 별도 writer가 canonical slug 수정을 commit한 뒤에는 새 주소를 반환합니다. 목록에서 시작한 retry는 다른 route 이동·unmount·새 실행으로 화면 후처리 권한이 종료됩니다. 같은 job ID로 목록을 재방문해도 이전 권한은 복원되지 않으며, 후착 mutation과 후속 조회의 성공·실패·종료 처리는 현재 route·알림·목록 재조회·새 실행의 대기를 바꾸지 않습니다. 이미 서버에 등록된 새 logical job은 취소·삭제하지 않습니다.

소개·번역 job의 단건/목록 조회와 생성·request·retry·소개 Apply 응답은 `dispatchStatus`, `runNotBefore`, `nextDispatchAt`, `retryOfJobId`를 전달합니다. `BACKOFF`는 실행 재시도 대기, `DISPATCH_RESERVED`는 dispatcher 전송 예약, `DUE`는 실행 가능한 대기 상태이며 SQS acknowledgement나 완료를 뜻하지 않습니다. 정상 NULL retry 관계는 NULL로 반환하고 실패 작업의 새 logical retry에는 원본 job ID를 남깁니다. 세 worker의 LLM 설정 snapshot은 claim 성공 후 첫 사용에서 읽어 attempt 안에 고정합니다. `LLM_CONFIG_READ_FAILED`도 해당 token의 실패로 기록되어 30초·120초 backoff 후 최대 세 번째 시도에서 failed로 수렴하며 키 정책 거절은 기존 오류 분류에 따라 fenced 실패로 남습니다. 소개 Writer/Reviewer와 번역의 status 없는 SDK 연결 오류(`APIConnectionError`·`APIConnectionTimeoutError`)도 SDK 자체 재시도 없이 기존 bounded provider retry와 소유 token의 job backoff를 따르며, caller abort는 재시도나 terminal 확정 없이 기존 lease 만료·recovery에 맡깁니다. claim을 얻지 못한 중복·terminal 메시지는 설정이나 공급자 호출을 시작하지 않습니다.

조사 검토 등록은 research job `FOR UPDATE`부터 새 미발행 Product, 관계, `reviewed_input`, `materialized_product_id`, `applied_at`까지 한 transaction으로 저장합니다. 같은 job으로 서로 다른 slug를 동시에 보내도 하나의 Product만 생성하며 재요청은 기존 Product를 반환합니다. `MaterializeResearchedProductInput.officialUrlConfirmed`는 필수 Boolean입니다. 조사 입력과 공식 URL이 달라졌다면 경로만 바뀐 경우에도 `true`를 명시해야 합니다. hostname 일치나 근거 ID는 공식 인증이 아니며, 관리자가 직접 확인합니다. 자동 발행·소개 생성·번역·색인은 실행하지 않습니다. `reviewed_input`은 migration `0013_stale_lester`로 추가하는 nullable JSONB이며 기존 사람 편집·적용 이력은 수정하지 않습니다.

조사 요청은 UUID v4 `requestId`가 필수이며 `request:UUID` unique key로 같은 ID·정규화 URL의 중복 전송을 하나의 job으로 묶습니다. 같은 ID에 다른 URL을 보내면 GraphQL `errors.extensions.code: IDEMPOTENCY_KEY_CONFLICT`로 거절합니다. 표준 하이픈 UUID와 기존 32자리 compact v4 입력을 지원합니다. 후속 `research_request_namespace` 데이터 migration은 지원 bare UUID 키만 UUID 텍스트를 그대로 둔 `request:UUID`로 원자 이관합니다. 기존 `request:`·`url:` 키와 지원 UUID가 아닌 키는 변경하지 않으며 job ID·상태·attempt/lease·예약·결과·provenance·재시도 관계·사람 편집과 등록/적용 이력을 보존합니다. bare 키와 이관 대상 `request:UUID`가 함께 있으면 URL 일치 여부와 관계없이 migration 전체를 rollback하고 명시적으로 거절하며 행 삭제나 이력 병합으로 우회하지 않습니다. 이관 뒤 조회는 `request:UUID` 하나만 사용합니다. 같은 URL의 새 조사 action과 실패 작업 재조사는 새 UUID·새 job으로 이전 결과를 보존합니다. 검색 결과는 질의별 rank를 round-robin으로 합친 뒤 canonical URL을 중복 제거해 최대 15개를 사용합니다. 비표준 port와 path는 보존하며 같은 호스트의 다른 경로가 섞이면 서버가 `AMBIGUOUS_PRODUCT`를 표시합니다. `INPUT_HOST`는 검색 입력 호스트 근거라는 뜻이지 공식 인증이 아닙니다. 외부 근거의 독립성은 hostname별로 구분합니다.

Brave 검색 키를 정상 조회했지만 저장 키와 환경 키가 모두 없거나 공백이면 조사는 첫 attempt에서 `SEARCH_NOT_CONFIGURED`로 종료합니다. 조회 SQL 장애는 키 부재로 바꾸거나 환경 키로 우회하지 않고 retryable `LLM_CONFIG_READ_FAILED`를 기존 조사 실패 처리에 전달합니다. 이 경우 `SEARCH_UNAVAILABLE`로 기록하며 같은 job을 30초·120초 backoff 후 재시도하고 최대 세 번째 attempt에서 failed로 끝납니다. backoff·활성 lease·terminal 상태의 중복 메시지는 키 조회나 검색·모델 호출을 시작하지 않습니다. 조회가 복구되면 기존 due job의 다음 attempt를 실행하며 키·SQL·원시 cause는 로그와 job에 남기지 않습니다. 검색 요청의 10초 budget과 부모 중단 신호는 성공 헤더 이후 응답 본문 수신이 끝나거나 실패할 때까지 실제 요청에 연결되어, 헤더만 도착하고 멈춘 본문도 중단하며 이전 요청이 끝난 뒤에만 다음 질의를 시작합니다. 본문 수신 중단의 `TIMEOUT`은 기존 실패 카운트·재시도 분류를 따르고 부모 중단은 terminal 확정 없이 lease 만료·recovery에 맡깁니다.

조사 wire shape는 `name`, `nameAnchors`, `summary`, `summaryAnchors`, `categoryCandidates`, `features[{name,summary,emoji,anchors}]`, `tags`, `companyCandidate`, `alternativeCandidates`, `suggestedSlug`, `warnings`입니다. anchor는 `{sourceId,excerpt}`이며 제공된 출처에 발췌가 실제로 있어야 합니다. sparse 응답은 `summary`·`companyCandidate`에 null과 빈 배열을 사용하고 이름 근거는 생략하지 않습니다. validator는 sparse 초안에서 생략된 선택 값을 복원하지만 schema 밖의 필드·타입·범위 초과·허용되지 않은 경고나 조작된 anchor를 sparse 성공으로 바꾸지 않고 `INVALID_GENERATION`으로 종료합니다. 회사·대안은 근거를 붙인 읽기 전용 제안이며 등록 입력에 자동 포함하지 않습니다.

관리자 `/products/new?researchJobId=...`는 해당 job의 편집값만 복원합니다. job별 localStorage 상태와 기존 최신 workspace 형식을 함께 보존하며 polling·조회·등록 실패가 사람 입력을 초기화하지 않습니다. 페이지가 보일 때 3초마다 조회하고 숨기면 중단하며 다시 보이면 즉시 조회 후 필요한 polling을 재개합니다. 현재 job 조회가 성공했지만 결과가 null이면 작업을 찾을 수 없다는 안내와 함께 polling을 중단하며, 미조회·조회 중·조회 오류와 구분합니다. 저장된 편집값을 유지한 채 수동 새로고침·새 조사 요청·수동 등록으로 복구할 수 있고, 부재만으로 자동 조사나 재조사를 요청하지 않습니다. 수동 조회에서 정상 job을 다시 찾으면 안내를 해제하고 진행 중 작업의 가시 페이지 polling을 재개합니다. 재조사·새 조사 요청·검토 등록은 같은 단조 증가 action 세대를 공유해, 후착한 이전 응답이 최신 action의 입력·사람 편집·workspace·job 이동을 덮어쓰지 않고 후착한 이전 action의 network/GraphQL 오류도 최신 화면에 남지 않습니다. 최신 action의 실제 실패만 오류로 표시하며 새 action 시작과 route 재진입이 이전 오류를 해제합니다. 검토 등록은 첫 로고 await 전에 최신 action 권한을 획득하므로, 완료된 A 화면에서 새 조사 B를 요청한 뒤 A를 등록해도 B의 후착 응답과 이미 시작한 조회가 A의 입력·로고·workspace·polling·알림·상세 이동을 바꾸지 않습니다. 이때 대체된 조회의 대기도 즉시 종료하되 기존 job·근거·사람 편집·로고·workspace는 유지합니다. 현재 등록이 로고 부재·업로드 실패·network/GraphQL 실패로 같은 화면에 남아도 결과 새로고침을 다시 사용할 수 있으며, 이후 시작한 조회의 대기는 이전 조회의 후착 응답이나 후처리가 해제하지 못합니다. 로고 업로드 또는 검토 등록 대기 중에는 로고 URL 직접 입력도 파일 선택·선택 취소와 함께 비활성화합니다. 현재 업로드·등록이 실패하면 URL 입력을 다시 사용할 수 있으며, 실패 후 수정한 URL은 화면·기존 v1 workspace·명시 재제출에 보존합니다. 다른 편집 필드와 새 조사·재조사·route 전환은 이 로고 잠금에 포함하지 않습니다. 검토 등록과 로고 업로드 후처리도 시작 시의 action 세대·job에 귀속되므로, 새 요청·재조사·route 재진입 이후에는 새 job ID가 아직 없어도 이전 실행의 성공·실패가 입력·로고·workspace·polling·알림·상세 이동을 바꾸지 않습니다. 서버에서 진행하거나 완료한 원자 등록과 이력은 그대로 보존합니다. 재조사나 검토 등록이 대체한 조사 요청의 중복 전송 키는 즉시 종료하므로, 현재 action 실패와 이전 응답 도착 후 같은 URL의 새 action은 새 UUID를 사용하고 실행 중인 동일 form의 중복 전송만 같은 키를 공유합니다. 검토한 이름·Feature·URL·로고·category로 미발행 생성 후 Product 상세로 이동하고 수동 등록 경로도 유지합니다. 서버 등록 후 응답 유실·새로고침으로 `materializedProductId`만 있고 저장된 `materializedSlug`가 없어도 기존 생성 버튼으로 검토를 명시적으로 재제출할 수 있습니다. 기존 idempotent 등록이 반환한 Product의 현재 slug로 이동하며 제안 slug나 저장 검토의 옛 slug로 주소를 추정하지 않습니다. 기존 Product·사람 편집·관계·검토 및 적용 이력을 다시 쓰거나 새 job·자동 발행·색인·번역·소개를 만들지 않으며, 현재 복구 실패는 입력을 보존한 오류로 표시해 같은 검토를 다시 제출할 수 있습니다. 이 복구 응답에도 같은 action 세대·job fence를 적용합니다. 브라우저용 합성 GraphQL transport는 화면 증거일 뿐 실제 DB 등록·DI 검증이 아니며, 실제 저장 계약은 위 격리 PostgreSQL suite로 별도 확인합니다.
태그는 편집 중 쉼표 구분자와 공백을 그대로 보여 주며, blur 없이 등록해도 최신 입력을 기존 `parseTagsInput`의 중복·빈 항목 제거와 공백 정규화에 따라 전달합니다. 편집용 원문은 현재 job 화면 안에서만 유지하고, 저장·재방문에는 기존 v1 형식의 정규화된 `review.tags` 배열을 사용합니다.

원자성 검증은 격리된 로컬 `darun_atomic_integrity` DB에만 연결하며 `ATOMIC_TEST_DATABASE_URL`이 없으면 명시적으로 SKIPPED입니다. 임시 PostgreSQL에 migration을 적용한 후 아래 명령으로 별도 connection의 phantom·잠금 경쟁·rollback·실제 DI/schema mutation을 확인합니다.

```bash
ATOMIC_TEST_DATABASE_URL=postgres://postgres:synthetic-only@127.0.0.1:55441/darun_atomic_integrity pnpm --filter @darun/products-datasource exec vitest run src/__tests__/W3AtomicApplyMaterialize.pg.test.ts
```

격리 PostgreSQL evidence 검증은 로컬 `darun_description_integrity` DB에만 연결합니다. `DESCRIPTION_EVIDENCE_TEST_DATABASE_URL`이 없으면 해당 suite는 명시적으로 SKIPPED입니다. 운영 DB 연결 문자열을 사용하지 않습니다.

```bash
DESCRIPTION_EVIDENCE_TEST_DATABASE_URL=postgres://postgres:synthetic-only@127.0.0.1:55433/darun_description_integrity pnpm exec vitest run libs/products/datasource/src/__tests__/descriptionEvidence.postgresql.test.ts
```

## 번역 작업의 완전성과 출처

`requestTranslation(entityType, entityId, fields)`의 공개 이름과 인자는 유지합니다. 응답은 실제 `pending` job이며 LLM을 기다리지 않습니다. 요청 `fields`는 migration `0014_superb_maverick`의 nullable `text[]`에 저장하고 Product/Magazine/ProductFeature worker와 retry가 같은 목록을 사용합니다. 기존 Product의 NULL fields만 전체 Product/Feature bundle로 읽습니다. 다른 엔티티의 NULL 또는 빈/알 수 없는 fields는 명시적으로 거절합니다. 전송 실패는 pending을 보존하며 기존 recovery tick이 다시 전송합니다.

앱의 `PostgresqlTranslationSourceStore`가 source를 fresh PostgreSQL transaction으로 읽습니다. Product/Feature는 공통 Product-first mutex, Magazine 갱신은 Magazine 행 잠금을 사용합니다. LLM 실행 후 같은 transaction에서 source를 다시 읽고 job/token을 잠근 다음 모든 번역 row와 server snapshot hash 및 `completed`를 함께 기록합니다. source 변경은 rows 없이 `superseded`, 조회 실패나 일부 field 실패는 rows 없이 실패하며 기존 영어와 사람 편집을 보존합니다. 독립 `completed` 상태 업데이트와 단건 저장 fallback은 없습니다.

단건/배치 값 변경에는 `sourceHash`, `model`, `promptVersion`이 모두 필요합니다. 누락/null로 기존 출처를 새 값에 상속하지 않습니다. 같은 값의 legacy no-op은 기존 provenance를 수정하지 않습니다. 실제 Provider의 bundle validator가 ID 길이·집합·중복·누락과 source가 있는 모든 field의 nonempty 번역을 확인하며 source가 없는 optional만 빈 값으로 허용합니다. 저장할 row hash는 provider 입력이 아닌 서버 source snapshot에서 계산합니다.

공개 Product/Feature 단건·배치 조회는 저장된 영어 값이 있고 그 row의 `sourceHash`가 현재 정규화 원문의 SHA-256과 직접 일치할 때만 영어를 반환합니다. hash 불일치나 legacy null provenance는 현재 한국어 원문으로 fallback합니다. row의 hash는 실제 번역 입력의 출처이고 job의 hash는 전체 snapshot을 식별하며, 어느 쪽도 서식 동등성을 입증하는 저장 원문이 아닙니다. 조회가 기존 영어·provenance를 수정하거나 번역 작업을 만들지는 않습니다.

parse5와 remark의 위치 정보로 HTML/Markdown 구문, quoted `>`, 중첩 목록, comment, entity, URL, 브랜드·숫자와 literal placeholder를 보호합니다. Markdown이 실제 HTML로 해석한 `code`·`pre`의 직접 텍스트와 중첩 하위 텍스트는 공백까지 Writer/Reviewer에 노출하지 않고 원문 바이트로 복원하며, 그 밖의 본문은 계속 번역합니다. `\<code>`·`\<pre>`처럼 backslash로 escape된 태그 표기는 HTML 보호 범위를 만들지 않으므로 표기 자체는 보존하되 그 사이 일반 본문·강조·참조 표시 문구는 번역합니다. 요청마다 충돌 없는 nonce를 사용하고 토큰 순서와 문서 구조를 검사합니다. 참조 링크의 collapsed(`[안내][]`)·shortcut(`[안내]`) 표기는 표시 문구와 definition identifier를 분리한 full 참조로 보호하므로 영어 표시 문구를 번역해도 원래 definition의 실제 목적지와 공유 참조 관계를 유지합니다. 이 변환은 번역용 문서에만 적용하며 `sourceHash`는 실제 현재 원문에서 계산합니다. 이 보호는 Product `description`, Magazine `content`, `isHtml` 요청 같은 문서 필드에만 적용하며, Product/Feature의 name·summary, Magazine의 title/summary와 Product bundle의 name/summary·Feature name/summary 같은 일반 텍스트는 들여쓰기·backtick·fenced-code처럼 보이는 literal 표기여도 placeholder로 숨기지 않고 원문 전체를 Writer/Reviewer에 전달합니다. Magazine의 title/summary/content와 Product bundle은 Writer/Reviewer 검증을 모두 통과해야 하며 reviewer 실패를 writer fallback으로 숨기지 않습니다. 새 Magazine 본문 UI는 추가하지 않습니다.

관리자 전용 `translationFreshness(entityType, entityId, fields)`는 각 원문 필드의 영어 번역을 `current`·`stale`·`missing`으로 표시합니다. row가 없으면 missing, hash 불일치와 legacy `sourceHash: null`은 stale이고 원문 없는 optional 필드는 current입니다. 의미가 같은 서식 편집이어도 원문 hash가 달라지면 공개 조회는 한국어 fallback이고 freshness는 stale입니다. Product는 기존 `requestProductTranslation`, ProductFeature와 Magazine는 기존 `requestTranslation`을 명시적으로 호출합니다. 실제 pending job의 worker가 현재 원문의 전체 요청 rows·새 provenance와 completed를 원자 저장한 뒤 current 영어 조회가 복구됩니다. Magazine 목록에서는 title/summary/content 번역 액션만 제공합니다. 번역 등록과 연결 job의 completed를 구분하고 전역 일괄 재예약이나 Magazine 본문 편집 화면은 추가하지 않습니다.

격리 PostgreSQL 검증은 `127.0.0.1`의 `darun_translation_integrity` DB만 허용합니다. 환경변수가 없으면 suite는 명시적으로 SKIPPED입니다. 운영이나 기존 개발 volume을 사용하지 않습니다.

```bash
TRANSLATION_TEST_DATABASE_URL=postgres://translation_test:isolated_only@127.0.0.1:55439/darun_translation_integrity pnpm --filter graphql-api exec vitest run __tests__/translationIntegrity.pg.test.ts
```

## 발행 검색·번역의 durable sync

Migration `0015_eminent_ezekiel`은 기존 이력을 변경하지 않고 Product의 bigint `content_revision`, `(product_id, source_revision, kind)` unique intent와 translation job의 unique `idempotency_key`를 추가합니다. canonical 편집·소개 Apply·발행·Tag·Category·Feature 및 관련 source 변경은 Product-first mutex 안에서 실제 before/after를 비교해 revision과 intent를 같은 commit에 저장합니다. 로고·timestamp 등 UI metadata만 바뀌면 작업을 만들지 않고, 의미가 같은 HTML 서식 변경은 검색 intent만 만들며 자동 translation intent·LLM job을 생성하지 않습니다. 저장 영어의 value/sourceHash/model/promptVersion과 과거 job 결과는 그대로 남고 새 원문에 자동 귀속하지 않습니다. 서식 변경으로 원문 hash가 달라지면 위 공개 조회 계약에 따라 한국어 fallback·stale로 표시하며 기존 명시 재번역으로 복구합니다. 실제 의미·URL·문서 구조 변경은 기존 durable 번역 경로를 사용합니다. HTML `pre`·`code`와 그 하위 텍스트의 줄바꿈·들여쓰기·앞뒤 및 연속 공백 변경도 의미 변경으로 구분해 검색·번역 intent와 연결 pending job을 같은 commit에 등록하며, 번역 결과는 변경된 코드 공백을 그대로 보존합니다. 문서 codec이 지원하는 fenced·indented Markdown code block의 줄바꿈·들여쓰기·연속 공백 변경도 같은 durable 번역 경로를 사용합니다. Markdown 문단의 병합·분리와 inline code literal 안의 연속 공백·tab 변경도 문서 구조·literal 의미 변경이므로 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. Markdown inline code 안의 line ending(LF·CRLF·CR)은 CommonMark 0.31.2 §6.1에 따라 space 하나와 동등하게 비교하므로 같은 구조·본문·literal의 편집은 search-only입니다. 이는 의미 비교에만 적용하며 번역용 literal 바이트나 원문 hash를 바꾸지 않고, HTML `code`·`pre`나 fenced·indented code의 공백을 일반화하지 않습니다. 같은 문단 안의 soft newline·표시용 공백이나 같은 문단 구조·code literal을 유지하는 편집은 계속 search-only입니다. 목록의 `ol.start`·`ol.reversed`·`li.value`로 실제 번호나 순서가 달라지는 편집도 의미 변경이며 검색·번역 intent와 연결 pending job을 같은 commit에 등록합니다. 속성 순서·class/style·presentation wrapper만 바뀌거나 `start` 생략과 기본값 `1`처럼 실제 번호가 같으면 계속 search-only입니다. 미발행 변경은 revision만 기록하며 최초 발행은 검색과 번역을 등록합니다. 이미 적용한 후보의 재요청은 추가 revision이나 intent를 만들지 않습니다.
Markdown 제목의 병합·분리와 깊이 변경은 remark의 `heading` 경계·`depth`를 최종 의미 비교까지 보존해 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. 같은 제목 경계·깊이·본문의 ATX/setext·닫는 marker 표현 차이와 일반 본문 표시용 공백은 계속 search-only이며 새 번역 job을 만들지 않습니다. code 안의 제목 표기는 heading으로 재해석하지 않고 기존 literal 계약을 따릅니다.
Markdown 인용문도 remark의 `blockquote` 계층과 실제 text를 보존해 `> 소개` 다음 줄의 `> 주의`와 한 줄의 `> 소개 > 주의`를 구분합니다. 본문 literal `>`의 추가·제거와 인용 경계·중첩 변경은 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. 같은 인용 계층·본문·code literal에서 soft newline·표시용 공백·유효 marker 표현만 다르면 계속 search-only이며 새 번역 job을 만들지 않습니다. code 안의 `>`는 인용 구조로 재해석하지 않습니다.
Markdown 순서·비순서 목록의 중첩·평탄화와 부모 항목·목록 종류·실제 시작 번호 변경도 remark의 `list`/`listItem` 계층으로 구분해 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. 반대로 같은 계층·실제 번호·code literal을 유지하는 marker·표시용 들여쓰기·본문 공백 차이는 search-only이며 새 번역 job을 만들지 않습니다.
Markdown 문단의 명시 hard break(two-space·backslash) 추가·제거·위치 이동이나 soft newline으로의 변경·그 반대 방향도 remark의 `break` 구조로 구분해 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. 같은 위치·본문의 hard break가 two-space와 backslash 표현으로 바뀌거나 soft newline·표시용 공백으로만 다른 편집은 계속 search-only이며, code 안의 hard break 표기는 code literal 공백 계약을 따릅니다.
Markdown autolink(`<https://example.com/a>`·`<contact@example.com>`)의 목적지 URL과 표시 내용 변경도 remark의 `link` 해석을 보존해 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. 같은 URL·본문·문서 구조에서 주변 표시용 공백·soft newline만 바뀌면 계속 search-only이며 새 번역 job을 만들지 않습니다. code 안의 autolink 표기는 링크로 재해석하지 않습니다.
일반 Markdown 링크·이미지의 angle 목적지(`[안내](<https://example.com/old>)`·`![대체](<https://example.com/old.png>)`)도 remark가 해석한 URL을 HTML 의미 비교까지 보존합니다. 표시 내용/alt가 같아도 실제 목적지가 바뀌면 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록하며, entity·escape가 HTML에서 다시 해석되어 다른 URL로 합쳐지지 않습니다. 같은 URL·표시 내용/alt·문서 구조에서 주변 표시용 공백·soft newline만 바뀌면 계속 search-only이고 새 번역 job을 만들지 않습니다. Markdown이 실제 HTML로 해석한 `code`·`pre` 및 Markdown code 안의 링크·이미지 표기는 링크로 재해석하지 않습니다. 반면 backslash로 escape된 `\<code>`·`\<pre>`는 문자 표기이므로 그 사이에서 Markdown이 해석한 링크·이미지·autolink·참조의 실제 목적지는 의미 비교에 남으며, 실제 HTML literal과 섞여 있어도 같은 구분을 적용합니다.
참조형 Markdown 링크·이미지도 full(`[안내][d]`)·collapsed(`[안내][]`)·shortcut(`[안내]`) 참조와 remark가 정규화한 identifier의 첫 definition URL을 연결해 비교합니다. 같은 표시 내용/alt에서 `[d]: <https://example.com/old>`의 실제 목적지만 바뀌어도 HTML 의미 비교에서 사라지지 않으며 같은 revision의 검색·번역 intent와 연결 pending job을 원자 등록합니다. entity·escape는 해석된 실제 URL 그대로 보존하고, 같은 URL·표시 내용/alt·문서 구조의 주변 표시용 공백·soft newline은 계속 search-only입니다. code 안의 정의·참조 표기는 링크로 재해석하지 않고 기존 literal 계약을 따릅니다.

스크린샷 삭제는 Product-first·screenshot 잠금 안에서 Flow 참조를 확인하고, 행 삭제·fresh source 재조회·revision 갱신·intent 등록을 원격 이미지 삭제보다 먼저 처리합니다. 이 DB checkpoint가 실패하면 원격 삭제를 호출하지 않으며 행·imageUrl·revision·기존 intent를 rollback해 공개 이미지를 보존합니다. 원격 삭제가 실패해도 같은 DB 변경을 rollback하고 오류를 반환합니다. 이는 새 checkpoint 실패 경로를 차단하는 순서 보장이지, 원격 삭제 성공 이후 DB commit 실패까지 복구하는 분산 transaction 보장은 아닙니다.

번역 job과 `sync:product:intentRevision:translation` intent는 같은 transaction에 한 번 등록됩니다. 실제 후속 **동일 kind** intent만 이전 의도를 대체합니다. 이름 변경 후 Tag 변경처럼 search-only revision이 늘어도 기존 번역 의도를 유지하고 worker가 현재 source를 읽습니다. 검색·번역의 상태와 실패는 독립적이며 한쪽 장애가 canonical commit이나 다른 작업의 성공을 취소하지 않습니다. 전송 누락·실패·만료 검색 lease는 기존 `job-recovery-tick`이 매분 재발견하며, 검색은 `PRODUCT_CONTENT_SYNC_QUEUE_URL`, 번역은 `TRANSLATION_QUEUE_URL`의 SQS worker로 보냅니다. 검색 intent의 실행 `retry_after`와 dispatcher 예약 `dispatch_after`는 별도입니다.

검색의 세 번째 실행이 중단되면 만료되거나 NULL인 lease를 tick 또는 재전송 처리에서 `SEARCH_ATTEMPTS_EXHAUSTED` failed로 전환하고 기존 token을 무효화합니다. 활성 lease와 completed/superseded는 종료하지 않습니다. 같은 revision의 수동 `indexProduct`는 pending/in_progress의 예산·예약·lease를 그대로 재사용하고, terminal intent만 같은 ID의 pending·시도 0·현재 due 예약·빈 lease로 원자 복구합니다. 복구 이후 이전 worker의 terminal 쓰기는 거절합니다.

Mongo 연결은 검색에서만 지연 초기화하므로 Mongo 장애 중에도 편집·Apply·번역 API/worker가 시작됩니다. 검색은 `SEARCH_UNAVAILABLE` intent로 남고 복구 후 재처리합니다. `productId` unique index 생성 전 중복 문서를 비파괴적으로 거절하며 자동 삭제·병합하지 않습니다. 검색 `sourceRevision`은 10진수 문자열→BigInt/BSON signed64 Long으로 변환하고 Number를 거치지 않습니다. 기존 revision이 없을 때만 -1로 읽으며 null/string/double/범위 밖 값은 `SEARCH_REVISION_INVALID`로 거절합니다. 원자 Mongo update pipeline은 동일·이전 revision 후착을 무시하고 기존 votes를 보존합니다.

`indexProduct(input:{slug})`는 `indexed`가 아니라 `intentId`, `productId`, 10진수 문자열 `sourceRevision`, `status`를 반환합니다. 예약·전송 실패·Mongo 지연은 완료가 아닙니다. 관리자 조회 `productContentSyncStatus(slug)`는 현재 전역 `sourceRevision`과 검색·번역 각각의 최신 intent 및 연결 번역 job 상태를 반환합니다. 검색 전용 후속 revision이 이전 번역 intent를 숨기지 않으며 `registered`는 영어 번역 완료가 아닙니다. 색인 화면은 소유한 예약이 있거나 검색·번역 intent 중 하나라도 `pending`/`in_progress`일 때만 1초 상태 polling을 하며, 둘 다 없는 terminal·`not_required` 응답 뒤에는 유휴 조회를 예약하지 않습니다. 초기 미응답이나 조회 실패를 자동 재시작하지 않고, 관찰 중이던 외부 intent가 모두 terminal이 되면 마지막 결과를 표시한 채 다음 타이머를 취소합니다. 외부 진행 중 intent의 색인 완료 알림을 새로 만들지 않습니다. `retryProductContentSync(slug)`는 각 kind 최신 failed intent만 Product-first transaction에서 재예약하고 실패 번역에는 새 logical job ID를 연결합니다. 일반 `retryTranslationJob`도 같은 최신 intent의 포인터만 새 ID로 옮기고 과거 job·canonical 원문을 보존합니다. 이때 새 pending job 등록과 그 최신 번역 intent의 `translationJobId`·상태 갱신은 Product-first 잠금 안 같은 PostgreSQL commit에 저장하므로, 등록이나 포인터 갱신 실패·commit 전 중단은 새 runnable job 없이 기존 intent·job을 그대로 남기고, commit 뒤 전송 누락·실패만 기존 `job-recovery-tick`이 새 job으로 완료합니다. 최신 intent가 이전 job을 가리키지 않으면 포인터를 빼앗지 않습니다. 최신 실패가 없으면 `CONTENT_SYNC_NOT_RETRYABLE`로 거절합니다. 관리자 색인 성공 알림은 요청한 Product와 검색 intent의 실제 `completed`만 근거로 합니다. 같은 revision ID를 재사용하거나 편집으로 새 ID를 받는 모든 색인 예약은 fresh 조회와 polling을 재개합니다. 예약 이후 시작한 현재 세대의 성공한 network 조회가 같은 Product의 다른 검색 intent와 더 큰 intent `sourceRevision`을 반환하면, Number를 거치지 않는 정수 비교로 기존 예약의 대체를 확인하고 그 화면 대기와 polling을 종료합니다. 대체는 완료나 성공이 아니며 최신 intent의 pending/in_progress/failed/completed 상태는 조회 영역에 그대로 유지합니다. 전역 revision 증가만으로는 대체를 판단하지 않고, 같은·이전 intent revision의 다른 ID·다른 Product·cache·예약 전 조회·이전 route/action 응답도 대체 근거가 아닙니다. 이후 현재 intent를 색인 재예약하거나 실패 재시도하면 새 요청 세대에서 다시 관찰하며, 그 intent의 실제 완료만 성공으로 알립니다. 최초 조회가 실패해도 예약 이후 시작한 후속 network 조회가 성공하면, 현재 요청 세대·slug·Product·intent가 일치하는 완료 응답으로 cached terminal fence를 해제합니다. Apollo cache가 값과 객체 참조를 재사용해도 성공을 한 번 알리며, 성공한 조회 없는 cached terminal이나 예약 전 in-flight·이전 route/request·다른 Product/intent 응답은 완료 근거가 아닙니다. 실패 동기화 재시도의 후속 조회·대기 갱신·알림도 현재 제품과 요청 세대에 귀속되므로, 제품 이동·재방문·새 action·unmount 뒤 이전 응답이 현재 조회를 되돌리거나 알림을 표시하지 않습니다. 이 화면 권한 해제는 이미 서버에 재예약된 intent·job을 취소하지 않습니다. 미존재·미발행 Product와 intent 기록 실패는 GraphQL 오류입니다.

격리 PostgreSQL 17/MongoDB 8 검증은 로컬 `darun_content_sync` DB만 허용하며 환경변수가 없으면 명시적으로 SKIPPED입니다. PR CI는 임시 서비스와 아래 suite, migration completeness 및 Node 22의 실제 6개 Lambda handler·전체 resolver schema 초기화를 연결합니다. 합성 모델·관리자 인증 fixture만 사용하며 운영 DB, 기존 volume, 원격 모델을 사용하지 않습니다.

PR CI는 MongoDB 8 이미지의 Linux 6.19 기동 호환 문제를 피하려고 `ubuntu-22.04` 실행기를 사용합니다([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). 실행기를 변경할 때는 PostgreSQL·MongoDB 서비스의 health check와 실제 저장소 통합 검사가 모두 통과하는지 확인합니다.

```bash
CONTENT_SYNC_TEST_DATABASE_URL=postgresql://sync:sync@127.0.0.1:55447/darun_content_sync CONTENT_SYNC_TEST_MONGODB_URI=mongodb://127.0.0.1:27047 CONTENT_SYNC_TEST_PROXY_PORT=27048 pnpm --filter graphql-api exec vitest run __tests__/contentSync.mongodb.test.ts __tests__/contentSyncMigration.test.ts
```

## UX 플로 기능 출시 절차 (VISUAL_FLOW_WRITES_ENABLED)

UX 플로 API는 `VISUAL_FLOW_WRITES_ENABLED` 환경 변수로 쓰기를 제어합니다. 값이 정확히 `true`일 때만 플로 생성·수정·삭제 mutation이 동작하고, 값이 없거나 `false`, 그 외 어떤 값이어도 Admin 권한 검사를 통과한 뒤 DB 작업 전에 `product-flow/writes-disabled` 오류로 거절합니다. 조회와 "플로가 참조 중인 스크린샷 삭제·플랫폼 변경 거절" 방어는 flag 값과 무관하게 항상 동작합니다. 기본값은 `false`이며 `.env.sample`, `sst.config.ts`, GitHub Actions `Deploy.yaml` 모두 `false`를 전달합니다.

이 기능의 DB 확장과 두 Vercel 웹(admin-web, visual-web) 배포가 겹치지 않도록, 아래 순서를 그대로 따릅니다. 각 단계에서 확인이 실패하면 해당 시점 이후 단계를 진행하지 않습니다.

### 사전 확인

1. Vercel 콘솔에서 두 웹(production `darun-admin`, `darun-visual`)의 **domain assignment(자동 도메인 할당)을 중지**합니다. 출시 절차가 끝날 때까지 자동 할당이 새 deployment를 프로덕션 도메인에 붙이지 않아야 합니다.
2. 두 웹의 현재 프로덕션 deployment URL과 커밋을 기록해 둡니다. 승격 실패 시 Instant Rollback 대상입니다.
3. 플로 스키마 확장 migration을 격리 환경에서 먼저 실행해 성공을 확인합니다. migration이 실패하면 이후 단계를 진행할 수 없습니다. GitHub Actions의 `Run Database Migrations` 단계는 `continue-on-error`가 없으므로 migration 실패 시 배포가 중단됩니다.
4. GitHub Secrets(`DATABASE_URL`, Vercel 토큰, AWS 자격 증명)과 Vercel 권한이 현재 계정에서 유효한지, 두 웹과 API의 기존 프로덕션 상태가 정상인지 확인합니다. 하나라도 확인되지 않으면 병합·승격을 진행하지 않습니다.

### 배포

1. `trunk`에 병합하면 품질 검사 → migration 순으로 실행됩니다. 이 시점의 새 API는 `VISUAL_FLOW_WRITES_ENABLED=false`로 배포되므로 플로 쓰기는 거절 상태이며, 기존 기능은 그대로 동작합니다.
2. 새 API 배포가 끝나면 Lambda의 `CodeSha256`이 GitHub Actions 로그의 배포 결과와 일치하는지, CloudFormation `LastUpdateStatus`가 `COMPLETE`인지, Lambda가 전체 트래픽을 받고 있는지(별칭 가중치 100%), 최대 `Timeout` 설정이 의도한 값인지를 AWS 콘솔에서 확인합니다.
3. 확인이 모두 끝나면 Lambda 환경 변수 `VISUAL_FLOW_WRITES_ENABLED`를 `true`로 바꾸고 배포합니다. 값은 정확히 `true`여야 합니다(대소문자·공백 구분).
4. Vercel 콘솔에서 같은 커밋의 새 deployment가 두 웹 모두 **staged** 상태로 존재하는지 확인합니다. 커밋 해시가 일치하지 않으면 승격하지 않습니다.
5. **admin 승격**: admin-web의 staged deployment를 프로덕션으로 승격하고, admin-web에서 제품 상세 → 플로 등록·수정·삭제가 동작하는지 확인합니다.
6. **visual 승격**: visual-web의 staged deployment를 프로덕션으로 승격하고, `/flows` 목록·검색·필터와 `/flows/[id]` 단계 탐색이 동작하는지 확인합니다.
7. 두 웹의 검증이 모두 끝났을 때만 domain assignment를 복구합니다.

### 승격·검증 실패 시 복구

- 두 웹 중 하나라도 승격이 실패하거나 검증이 실패하면, **바뀐 두 웹 모두** 사전에 기록해 둔 기존 deployment로 Instant Rollback합니다.
- 롤백 후에도 새 API, DB 확장, 스크린샷 삭제 방어는 그대로 유지하고 `VISUAL_FLOW_WRITES_ENABLED`만 `false`로 되돌립니다.
- 복구와 재시도 동안 domain assignment는 계속 꺼 둡니다. 재시도는 사전 확인부터 다시 시작하며, 두 신규 웹이 모두 성공한 뒤에만 자동 할당을 복원합니다.
- Instant Rollback 자체가 실패하면 이후 승격을 시도하지 않고 운영 장애로 처리합니다. (장애 처리 절차를 따릅니다.)

### 비고

- 격리 환경 검증은 flag 기본 동작(true/false/누락·오타), flag `false`에서도 참조 화면 삭제 방어가 유지됨, mutation 실패 시 입력 보존을 확인합니다. 위 절차의 AWS/Vercel 콘솔 조작은 실제 프로덕션에서 수행하는 작업이므로 격리 환경 검증과 혼동하지 않습니다.

## 외부 정리 체크리스트 (수동 작업)

원격 `dev` 환경을 제거함에 따라, 저장소 외부의 클라우드 리소스와 설정을 정리해야 합니다. 아래 항목은 수동으로 진행하며, 서비스 영향도를 꼭 확인하고 실행해야 합니다.

- [ ] **GitHub environment 정리**:
  GitHub 저장소 설정에서 사용하지 않는 `dev-graphql` environment를 제거합니다.
- [ ] **AWS Stack 삭제**:
  실제 유입되는 트래픽이 없는 것을 확인한 다음, AWS CloudFormation 또는 Serverless로 생성된 `dev-graphql-api` 스택을 삭제합니다.
- [ ] **Vercel 설정 검토**:
  사용자 웹, 어드민 웹, 비주얼 웹의 Vercel preview 및 dev 환경 설정을 점검하고 불필요한 연결을 끊습니다.
- [ ] **Sentry 환경 검토**:
  Sentry 대시보드에서 dev 환경으로 들어오는 이벤트를 필터링하거나 더 이상 쓰지 않는 dev 환경 관련 데이터를 정리합니다.
- [ ] **Cloudinary 폴더 검토**:
  Cloudinary 미디어 라이브러리에서 dev 전용으로 사용하던 업로드 폴더를 정리합니다. 프로덕션 환경(`RUNNING_ENV=prod`)에 영향을 주지 않도록 주의합니다.
- [ ] **개발용 시크릿(Secrets) 정리**:
  외부 서비스나 GitHub Secrets에 등록되어 있던 dev 환경용 API 키와 인증 토큰 정보를 삭제합니다.
- [ ] **Serverless Framework 정리**:
  GitHub Secrets의 `SERVERLESS_ACCESS_KEY`를 삭제합니다. Serverless Dashboard `croco/darun` 앱을 정리합니다. SST 마이그레이션 전환 완료 후 기존 `prod-graphql-api` CloudFormation 스택을 AWS 콘솔 또는 `serverless remove --stage prod`로 삭제하고, `darun-deploy-bucket` S3 버킷의 serverless 배포 아티팩트를 비웁니다.

## 코드 품질

PR을 올리기 전에 아래 명령이 모두 통과해야 합니다.

```bash
pnpm audit --audit-level=critical  # Critical 의존성 취약점 검사
pnpm lint           # ESLint + Prettier 검사
pnpm typecheck      # TypeScript 타입 검사
pnpm test           # Vitest 단위 테스트
pnpm test:coverage  # 커버리지 포함 테스트 (lcov/html 리포트 생성)
```

앱의 ESLint glob은 따옴표로 감싸 중첩 소스까지 검사합니다. Next.js가 생성하는 `.next/`와 `next-env.d.ts`는 검사 대상에서 제외합니다.

GraphQL 변경은 Node.js 22에서 `pnpm --filter graphql-api build:lambda`와 `pnpm --filter graphql-api verify:lambda`도 실행합니다. 이 검사는 번들 초기화뿐 아니라 실제 resolver 스키마와 커밋된 `schema.graphql`의 일치 여부를 확인합니다.

목록 API의 `productsByCategory`와 `visualApps`는 기본 24개씩 반환합니다. 호출자는 `pageInfo.endCursor`와 `hasNextPage`로 이어 읽으며, 목록 표시를 위해 모든 페이지나 각 앱의 화면 목록을 미리 읽지 않습니다. 앱 카드에는 `coverScreenshot`과 `screenshotCount`를 사용합니다. 상품의 태그·추천 수는 선택된 필드만 배치 조회하며, 변경 가능한 데이터를 읽는 상품 ID loader는 요청 사이에 결과를 보관하지 않습니다.

Next.js 버전은 workspace catalog와 override를 함께 갱신하며 모든 웹 앱은 catalog를 사용합니다. OpenTelemetry API는 웹과 서버 SDK의 공통 호환 범위인 `1.9.1`로 통합합니다. 서로 다른 peer 버전으로 Drizzle 타입이 중복 생성되는 것을 방지하며, Lambda의 Sentry·profiling SDK `10.38.0`과 기존 서버 계측 설정은 유지합니다. 의존성 취약점은 감사 기준을 낮추거나 제외하지 않고 수정 버전과 잠금 파일을 함께 갱신합니다.

HTML/Markdown 의미 전환의 공통 원문과 영어 기대값은 `libs/translation/datasource/src/__tests__/descriptionMeaningTransitions.fixture.ts`에서 관리합니다. 단위 검사와 DB 통합 검사는 같은 입력만 공유하며, 영어 기대값은 생산 비교 함수나 번역 응답으로 계산하지 않는 명시적 리터럴을 유지합니다. 자격 증명 거절 사례는 `apps/graphql-api/__tests__/llmSettingCredential.fixture.ts`에서 실행 시 생성하며, HTTP와 SDK 검사 각각의 URI 인코딩 차이는 해당 검사에 남깁니다.

모델 선택 검사는 모델 ID가 표시되어 목록 로딩이 끝난 뒤 버튼의 접근성 역할·검색 필터·선택 결과를 확인합니다. 로딩을 기다리는 동안 접근성 트리 전체를 반복 탐색하지 않으며, 개별·전역 timeout은 늘리지 않습니다.

포맷 자동 수정은 다음 명령을 사용합니다.

```bash
pnpm format
```

Lefthook이 설치되어 있으면 커밋 전 ESLint 검사가 자동으로 실행됩니다.

### 커버리지 목표

계층별 목표 threshold는 `@darun/utils-vitest-config`의 `thresholds` 상수로 관리됩니다. 현재 목표를 충족하는 패키지는 `vitest.config.ts`에서 적절한 threshold를 적용하고, 아직 충족하지 못하는 패키지는 리포트 생성을 먼저 활성화한 뒤 테스트 보강과 함께 threshold를 적용하세요.

| 계층 | lines / branches | 적용 패키지 예시 |
| --- | --- | --- |
| Domain | 85% / 65% | `**/domain` |
| Datasource | 85% / 65% | `**/datasource` |
| Feature (GraphQL resolver) | 70% / 55% | `**/feature` |
| Shell / UI | 60% / 45% | `**/shell`, `**/ui-*` |

### 새 패키지 vitest 설정

테스트가 있는 새 패키지는 `vitest.config.ts`를 포함해야 합니다. `@darun/utils-vitest-config`의 팩토리 함수를 사용하고, 계층별 목표를 충족하는 시점에 `thresholds` 상수를 적용합니다.

```typescript
// 백엔드 domain 패키지 — threshold 포함
import { defineConfig } from 'vitest/config';
import { createNodeConfig, thresholds } from '@darun/utils-vitest-config';
export default defineConfig(
  createNodeConfig({ test: { coverage: { thresholds: thresholds.domain } } }),
);

// 프론트엔드 shell 패키지 — threshold 포함
import { defineConfig } from 'vitest/config';
import { createJsdomConfig, thresholds } from '@darun/utils-vitest-config';
export default defineConfig(
  createJsdomConfig({ test: { coverage: { thresholds: thresholds.shell } } }),
);

// threshold 없이 기본 설정 (barrel·util 패키지)
import { defineConfig } from 'vitest/config';
import { createNodeConfig } from '@darun/utils-vitest-config';
export default defineConfig(createNodeConfig());
```

테스트가 없는 패키지는 `test` 스크립트를 생략합니다. `echo`만 실행하는 작업은 검증이 아니므로 Turbo 테스트 그래프에 추가하지 않습니다. 공통 설정의 `passWithNoTests`는 Vitest를 사용하는 패키지에만 적용됩니다.

`pnpm test:coverage` 실행 시 lcov·html 리포트가 각 패키지 `coverage/` 디렉터리에 생성되고, CI에서 `coverage-reports` 아티팩트로 업로드됩니다.

## 모노레포 구조

```text
.
├── apps/          # 배포 가능한 애플리케이션
│   ├── graphql-api/   # Apollo Server (GraphQL, Lambda)
│   ├── service-web/   # 사용자 대상 Next.js 앱
│   ├── admin-web/     # 운영용 백오피스 Next.js 앱
│   └── visual-web/    # 비주얼 중심 Next.js 앱
└── libs/          # 공유 도메인 라이브러리
    ├── shared/        # 공통 유틸리티
    └── ...            # 도메인별 라이브러리 (accounts, products 등)
```

`libs/`의 패키지는 `apps/`에서만 import합니다. `apps/` 간 직접 import는 하지 않습니다.

## 기여 프로세스

1. 저장소를 fork합니다.
2. 작업 브랜치를 만듭니다. 브랜치 이름은 작업 내용을 반영합니다 (예: `fix-login-redirect`, `feat-product-filter`).
3. 변경 사항을 커밋합니다. 커밋 메시지는 변경의 의도를 담습니다.
4. PR을 올립니다. PR 설명에 변경 이유와 테스트 방법을 적습니다.
5. 리뷰어의 피드백을 반영하고 승인을 받으면 merge합니다.

`trunk` 브랜치에 직접 push하지 않습니다.
