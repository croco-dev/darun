# tier-web

앱스토어 앱을 티어(1/2/3/없음)로 분류해 탐색하는 Next.js 앱. 모노레포(`darun`)의 `apps/tier-web`로 동작한다. UI와 기능은 가져온 원본 그대로 유지한다.

## 실행

```bash
pnpm --filter tier-web dev      # :3003
pnpm --filter tier-web build
pnpm --filter tier-web start    # :3003
pnpm --filter tier-web test
pnpm --filter tier-web typecheck
pnpm --filter tier-web test:coverage
pnpm exec turbo run cloudflare:build --filter=tier-web
```

## 기능

- 티어 목록/검색/페이지네이션(`/`, `/apps`, `/new`, `/apps/[id]`)
- 관리자(`/admin`): 앱 검색/페이지네이션, 티어 할당, 메모 편집/삭제, App Store 키워드 수집
- 인증(`/auth/signup`, `/auth/signin`): 이메일/비밀번호 가입·로그인, `/auth/callback`에서 세션 교환 후 `/` 이동(실패 시 `/auth/auth-code-error`)
- 설정(`/settings`): 로그인 사용자 비밀번호 변경

## 환경 변수

`.env.sample` 참고. 실제 값은 `.env.local` 등에 둔다(커밋 금지).

루트에서 `pnpm install` 후 `.env.sample`을 이 앱의 `.env.local`로 복사하고 값을 설정한다. 개발용 Supabase 인증 Redirect URL에는 `http://localhost:3003/auth/callback`을 허용한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 가입 후 `users` 동기화 등)
- `NEXT_PUBLIC_SITE_URL` (기본 `https://tier.darun.io`, 메타데이터/robots/sitemap 기준)
- `DATABASE_URL` (수동 DB 도구 `scripts/*` 전용)

## Supabase/DB 전제

- 독립 Supabase 프로젝트/DB를 그대로 사용한다. 자동 마이그레이션 없음.
- `drizzle/` SQL은 최초 1회 Supabase SQL Editor 등에서 수동 적용한다.
- `scripts/remove-duplicates.ts`, `scripts/enforce-schema-manual.ts`는 수동 실행 전용이며 `DATABASE_URL`만 사용한다.
- 관리자 여부는 DB `users.is_admin`으로 판단한다.

## Cloudflare 빌드·배포

Worker `darun-tier`, R2 `darun-tier-inc-cache`, 도메인 `tier.darun.io`를 유지한다. Next.js는 이 앱에만 `16.3.8`을 사용한다. 공통 catalog의 `16.3.5`는 보안 패치 및 OpenNext `1.20.10` 지원 범위를 만족하지 않아, 루트의 `tier-web>next` override로 다른 앱과 분리했다.

```bash
pnpm --filter tier-web cloudflare:build
pnpm --filter tier-web preview
```

`deploy`와 `upload`는 실제 Cloudflare 리소스를 변경하는 명령이므로 별도 배포 승인이 있을 때만 실행한다. `deploy`의 `--keep-vars`는 기존 Worker 환경 변수를 유지한다. 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`는 Worker에 설정하며 브라우저 번들에 넣지 않는다.

로컬 `.env.local`의 사이트 URL로 배포하지 않도록, 승인된 운영 배포 시에는 `NEXT_PUBLIC_SITE_URL=https://tier.darun.io pnpm --filter tier-web deploy`로 빌드 URL을 지정한다.

`NEXT_PUBLIC_*`는 빌드 시 번들에 고정되므로 배포 빌드에는 실제 publishable URL/키가 필요하다. `.github/workflows/TierWeb.yaml`은 저장소 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 요구한다. 실제 배포는 `deploy=true` 입력과 `tier-web-prod` 환경의 `TIER_CLOUDFLARE_API_TOKEN`, `TIER_CLOUDFLARE_ACCOUNT_ID`가 있어야 진행한다. PR CI의 빌드 전용 기본값은 배포에 사용하지 않는다.

검색 입력을 지웠을 때 이전 검색 응답이 목록을 덮어쓰지 않는 동작은 `AppsClient.test.tsx`로 검증한다. DB 변경이 필요한 가입·관리자 쓰기 작업은 자동 검증에서 실행하지 않는다.

## 원본 및 라이선스

`croco-dev/darun-tier`의 `03f7094310a84a061ff4b1c4829a735d86925ca5` 리비전에서 가져왔다. 원본 README의 MIT 라이선스 표기를 유지한다.
