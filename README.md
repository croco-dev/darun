# darun.io

darun.io는 pnpm workspace와 Turborepo 기반으로 구성된 모노레포입니다.

## Project Structure

```text
.
├── apps/
│   ├── graphql-api/
│   ├── service-web/
│   ├── admin-web/
│   └── visual-web/
├── libs/
│   ├── accounts/
│   ├── companies/
│   ├── images/
│   ├── magazines/
│   ├── opengraph/
│   ├── pages/
│   ├── products/
│   ├── recommendation/
│   ├── search/
│   ├── shared/
│   ├── translation/
│   └── voting/
└── package.json
```

### Apps

| App                | 역할                                                                  | 로컬 개발 포트 |
| ------------------ | --------------------------------------------------------------------- | -------------- |
| `apps/graphql-api` | Apollo Server 기반 GraphQL API, AWS Lambda 및 Serverless Offline 실행 | `4000`         |
| `apps/service-web` | 사용자 대상 메인 서비스 웹, Next.js 15 기반 프론트엔드                | `3000`         |
| `apps/admin-web`   | 운영용 관리자 웹, Next.js 기반 백오피스                               | `3001`         |
| `apps/visual-web`  | 비주얼 중심 웹 경험을 제공하는 Next.js 프론트엔드                     | `3002`         |

### Libs

- 도메인 라이브러리: `accounts`, `companies`, `images`, `magazines`, `pages`, `products`, `recommendation`, `search`, `translation`, `voting`
- 공통 라이브러리: `shared`
- 추가 웹 관련 라이브러리: `opengraph`

## Prerequisites

- Node.js `>= 22`
- pnpm `>= 10`

## Getting Started

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

각 앱 디렉토리에 `.env.sample`을 복사해 `.env` 파일을 만들고 값을 채웁니다.

```bash
cp apps/graphql-api/.env.sample apps/graphql-api/.env
cp apps/service-web/.env.sample apps/service-web/.env.local
cp apps/admin-web/.env.sample apps/admin-web/.env.local
cp apps/visual-web/.env.sample apps/visual-web/.env.local
```

### 3. 개발 서버 실행

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

> `graphql-api`와 `service-web`은 포트가 다르므로 동시에 실행할 수 있습니다.

### 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Tech Stack

- Monorepo: pnpm workspace, Turborepo
- Frontend: React 19, Next.js 15, Tailwind CSS 4
- Backend: Apollo Server, TypeDI, AWS Lambda, Serverless
- Data: Drizzle ORM, Mongoose
- Quality: ESLint, Prettier, Vitest, Lefthook
