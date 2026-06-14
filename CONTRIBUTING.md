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

3. **배포 실행**:
   품질 검사를 모두 통과하면 백엔드 리소스가 자동으로 배포됩니다.
   배포 명령: `serverless deploy --stage prod`
   이때 `RUNNING_ENV=prod` 값은 Sentry 환경 분류와 Cloudinary 업로드 폴더 규칙에 영향을 주므로 그대로 유지해야 합니다.

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

## 코드 품질

PR을 올리기 전에 아래 명령이 모두 통과해야 합니다.

```bash
pnpm lint        # ESLint + Prettier 검사
pnpm typecheck   # TypeScript 타입 검사
pnpm test        # Vitest 단위 테스트
```

포맷 자동 수정은 다음 명령을 사용합니다.

```bash
pnpm format
```

Lefthook이 설치되어 있으면 커밋 전 ESLint 검사가 자동으로 실행됩니다.

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
