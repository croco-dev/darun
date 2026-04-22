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
| `INFRA_ENV` | 인프라 환경 식별자 (`local`, `dev`, `prod`) | 필수 |
| `RUNNING_ENV` | 런타임 환경 식별자 | 필수 |
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
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL API 엔드포인트 URL | 필수 |
| `NEXT_PUBLIC_BASE_URL` | 서비스 베이스 URL | 필수 |
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
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL API 엔드포인트 URL | 필수 |

#### `apps/visual-web`

| 변수 | 설명 | 필수 |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 웹 API 키 | 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | 필수 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | 필수 |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK 클라이언트 이메일 | 필수 |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK 비공개 키 | 필수 |
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL API 엔드포인트 URL | 필수 |
| `NEXT_PUBLIC_BASE_URL` | 서비스 베이스 URL | 필수 |
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

`main` 브랜치에 직접 push하지 않습니다.
