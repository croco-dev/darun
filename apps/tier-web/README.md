# tier-web

앱스토어 앱을 티어(1/2/3/없음)로 분류해 탐색하는 Next.js 앱. 모노레포(`darun`)의 `apps/tier-web`로 동작한다. 등록된 앱에 대한 Croco 팀의 분류이며 공식 인증이나 전체 앱스토어의 목록은 아니다.

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
- 조회 실패는 빈 목록과 구분해 재시도를 제공한다. 유효하지 않은 `tier` 값은 서버와 탭에서 모두 1티어로 해석한다.
- 앱 카드 전체는 접근 가능한 이름을 가진 링크이며 작은 아이콘은 지연 로딩한다. JSON-LD는 실제 script 삽입 지점에서 `<`를 이스케이프한다.
- 인증 callback의 `next`는 같은 origin의 로컬 경로만 허용하며 외부 URL·userinfo·역슬래시와 임의 forwarded-host는 리다이렉트 대상으로 신뢰하지 않는다.

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

### 원자적 티어 변경 전제

`0002_atomic_tiers.sql`은 기존 마이그레이션 이후 적용하는 전방 전용 변경이다. 배포 전에 별도 승인된 DB 백업과 격리 DB 검증이 필요하며, 앱 코드보다 먼저 적용한다. 자동 실행하거나 기존 마이그레이션을 다시 적용하지 않는다.

- 같은 앱의 중복 티어는 `assigned_at DESC NULLS LAST, id DESC` 순서의 첫 행만 유지한다. 삭제되는 이전 할당의 메모까지 필요하면 적용 전 `tiers` 전체를 별도 보관한다. 동률은 UUID 내림차순으로 결정하며, 이 순서는 생성 시각을 뜻하지 않는다.
- 기존 티어가 0~3 밖이면 전체 트랜잭션을 중단한다. 값을 임의로 바꾸지 않으며 담당자가 데이터를 확인·수정한 뒤 다시 적용한다.
- 테이블 잠금, 중복 정리, UNIQUE/CHECK와 두 FK의 CASCADE 변경이 한 트랜잭션에서 수행된다. 적용 도구가 SQL을 개별 트랜잭션으로 분할하지 않아야 한다. 기존 FK 이름은 앞선 두 마이그레이션과 같아야 한다.
- `tiers.app_id` 유일 제약으로 동시 변경은 단일 upsert가 되고, 티어 없음도 0으로 저장한다. 앱 삭제는 부모 DELETE 한 문장이며 티어·메모는 DB에서 함께 삭제한다. 기존 RLS 정책은 유지되므로 관리자에게 부모 DELETE 및 티어 INSERT/UPDATE 권한이 필요하다.
- 티어 없음 목록은 PostgREST의 별칭 임베드 anti-join을 사용한다. 격리 PostgREST에서 명시적 0과 미할당 앱이 이름·ID 순서로 섞여 24개씩 반환되는지 확인한다. 정렬은 DB 기준이며 클라이언트에서 다시 정렬하지 않는다. 조회 중 데이터 자체가 변경되는 경우 offset 페이지의 스냅샷 일관성을 보장하지는 않는다.

Drizzle journal/snapshot은 스키마와 이 전방 SQL에 맞춰 생성·검토한 뒤 함께 배포한다. 운영 DB 마이그레이션과 배포는 별도 승인 대상이다.

## Cloudflare 빌드·배포

Worker `darun-tier`, R2 `darun-tier-inc-cache`, 도메인 `tier.darun.io`를 유지한다. 모노레포 공통 catalog와 override의 Next.js `16.3.8`을 사용하며, Cloudflare 빌드에는 OpenNext `1.20.10`을 사용한다.

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
