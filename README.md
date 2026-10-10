# darun.io

darun.io는 pnpm workspace와 Turborepo 기반으로 구성된 모노레포입니다.

## Project Structure

```text
.
├── apps/
│   ├── graphql-api/
│   ├── service-web/
│   ├── admin-web/
│   ├── visual-web/
│   └── tier-web/
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
| `apps/tier-web`    | 독립 앱스토어 티어 분류 웹, Next.js + Supabase, Cloudflare Workers 배포 | `3003`         |

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

tier-web는 Supabase 기반 독립 앱입니다. `apps/tier-web/.env.local` 파일을 만들고 다음 값을 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://tier.darun.io
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
pnpm --filter tier-web dev      # http://localhost:3003
```

> `graphql-api`와 `service-web`은 포트가 다르므로 동시에 실행할 수 있습니다.

### 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### tier-web (독립 앱)

- 소스: `croco-dev/darun-tier` 리비전 `03f7094310a84a061ff4b1c4829a735d86925ca5`를 `apps/tier-web`로 가져온 독립 앱입니다.
- 인증/DB 분리: Supabase Auth와 tier 전용 Supabase Postgres만 사용합니다. 기존 Firebase/MongoDB/AWS 스택과 공유하지 않습니다.
- 모노레포 앱은 보안 패치된 Next.js `16.3.8`을 공통으로 사용하며, tier-web의 Cloudflare 빌드는 OpenNext `1.20.10`을 사용합니다. CI의 critical 취약점 검사를 위해 `shell-quote`와 `handlebars`도 패치 버전 이상으로 고정합니다.
- 명령어:
  ```bash
  pnpm --filter tier-web dev              # http://localhost:3003
  pnpm --filter tier-web run build
  pnpm --filter tier-web run cloudflare:build
  pnpm --filter tier-web run preview
  ```
- 수동 배포 전제 조건: Cloudflare 계정에 Worker `darun-tier`, R2 버킷 `darun-tier-inc-cache`, 커스텀 도메인 `tier.darun.io`가 이미 존재해야 하며, Supabase URL/키를 포함한 Worker vars는 Cloudflare에 유지됩니다.
- 배포 빌드에는 실제 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 필요합니다. 브라우저 번들에 고정되는 값이므로 배포 후 Worker vars로 대체할 수 없습니다. 수동 workflow의 빌드 단계는 같은 이름의 저장소 변수를 요구하며, 배포 단계는 `tier-web-prod` 환경의 `TIER_CLOUDFLARE_API_TOKEN`, `TIER_CLOUDFLARE_ACCOUNT_ID`를 사용합니다.
  ```bash
  NEXT_PUBLIC_SITE_URL=https://tier.darun.io pnpm --filter tier-web run deploy
  ```
- CI: 루트 PR 파이프라인이 새 패키지를 기존 turbo 스크립트로 함께 검증합니다. Cloudflare 배포는 `.github/workflows/TierWeb.yaml`에서 `workflow_dispatch`로만 수동 실행하며, `deploy` 입력을 `true`로 주지 않으면 자동 배포되지 않습니다. AWS `Deploy.yaml` 경로는 변경되지 않습니다.

## Tech Stack

- Monorepo: pnpm workspace, Turborepo
- Frontend: React 19, Next.js 15, Tailwind CSS 4
- Backend: Apollo Server, TypeDI, AWS Lambda, Serverless
- Data: Drizzle ORM, Mongoose
- Quality: ESLint, Prettier, Vitest, Lefthook

## Contributing

환경 변수 설명, 개발 워크플로우, 코드 품질 도구, 기여 프로세스는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.
