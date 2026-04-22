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
| `apps/graphql-api` | Apollo Server 기반 GraphQL API, AWS Lambda 및 Serverless Offline 실행 | `3000`         |
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

### Installation

```bash
pnpm install
```

### Development

전체 워크스페이스를 함께 실행합니다.

```bash
pnpm dev
```

개별 앱만 실행하려면 각 앱 디렉토리에서 아래 명령을 사용합니다.

```bash
pnpm --filter graphql-api dev
pnpm --filter service-web dev
pnpm --filter admin-web dev
pnpm --filter visual-web dev
```

기본 검증 명령은 아래와 같습니다.

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
