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

### 수동 스키마 복구

`pnpm --filter tier-web exec tsx scripts/enforce-schema-manual.ts`는 `DATABASE_URL`의
`public.memos` 테이블과 누락된 메모 외래 키·메모 app ID 및 앱스토어 ID 유일 제약을 복구한다.
운영 DB 실행은 별도 승인 범위에서 수행한다. 전체 migration을 대신하는 도구는 아니다.

성공은 메모의 `app_id → public.apps.id` 외래 키가 검증된 `ON DELETE CASCADE /
ON UPDATE NO ACTION` 제약이고, `public.apps.apps_app_store_id_unique`가 실제
`app_store_id` 유일 제약이고, `public.memos.memos_app_id_unique`가 실제 `app_id`
유일 제약임을 확인한 뒤 transaction이 commit됐다는 뜻이다.
정상 스키마의 재실행은 기존 행과 제약을 그대로 보존한다.

기존 외래 키의 대상·삭제 규칙 등이 다르거나 검증되지 않은 제약이면 실패한다.
기존 `NO ACTION` 제약은 현재 전방 migration `0002_atomic_tiers.sql`의 적용 여부를
확인하고 별도 검토한다. 고아 메모·중복 메모 app ID·중복 앱스토어 ID도 자동 삭제하지 않는다.
누락된 객체 생성부터 사후 검증까지 한 transaction에서 수행하므로 중간 실패 시
이번 실행의 DDL 전체를 rollback한다. 오류를 해결한 뒤 같은 명령으로 재실행한다.
복구 중 앱·메모 쓰기는 잠금이 풀릴 때까지 대기하므로 유지보수 시간에 실행한다.

격리 PostgreSQL의 **빈 로컬 전용 DB** `darun_schema_recovery`를
`SCHEMA_RECOVERY_TEST_DATABASE_URL`로 지정하고 다음 명령으로 실제 CLI의 복구·
제약 불일치·자료 보존·중간 실패 rollback·재실행을 검증한다. 환경변수가 없으면
일반 테스트에서는 이 suite를 건너뛴다. 테스트는 fixture 테이블을 삭제하므로
운영 DB나 다른 테스트의 DB를 사용하지 않는다.

```bash
SCHEMA_RECOVERY_TEST_DATABASE_URL=<isolated-local-db-url> pnpm --filter tier-web exec vitest run src/enforce-schema-manual.pg.test.ts
```

### 중복 앱 정리

`pnpm --filter tier-web exec tsx scripts/remove-duplicates.ts`는 기본 dry-run이다.
`--dry-run`도 같은 동작이며 DB를 쓰지 않는다. JSON 보고서에서 정규화할 App Store ID,
남길 앱, 삭제할 앱, 이전할 메모·분류, 충돌의 양쪽 값을 확인한 뒤 같은 명령에
`--apply`를 붙여 적용한다. 보고서에는 메모 내용과 분류 정보가 있으므로 공개 로그에 올리지 않는다.
운영 DB 적용은 별도 승인 범위에서 수행한다.

분류가 있는 앱, 메모가 있는 앱, 최근 생성 앱 순으로 남길 앱을 정하고 동률은 UUID로 결정한다.
남길 앱에 없는 메모·분류는 원래 행 ID와 시각을 보존해 이전한다. 메모 본문이 다르거나
분류의 tier·notes·assignedBy가 다르면 그룹 전체를 변경하지 않고 `conflict`로 보고한다.
같은 내용의 중복만 제거하며, 남길 앱의 행을 우선 보존한다. 시각만 다른 동일 내용도 중복으로 본다.
충돌 그룹이 있어도 다른 정상 그룹은 처리하므로 `groups[].status`를 모두 확인한다.

적용은 앱·분류·메모 테이블의 쓰기를 잠그고 최신 데이터를 읽어 하나의 transaction으로 확정한다.
중간 쓰기나 commit이 실패하면 이번 실행 전체가 롤백된다. 읽기는 계속 가능하지만 관리자 쓰기는
완료까지 대기하므로 유지보수 시간에 실행한다. dry-run은 잠금을 잡지 않으며 적용은 당시 데이터를
다시 판단하므로 두 보고서가 달라질 수 있다. 같은 입력을 다시 적용하면 추가 변경이 없다.

격리 PostgreSQL의 **빈 전용 DB**를 `DEDUPE_TEST_DATABASE_URL`로 지정하고
`pnpm --filter tier-web exec vitest run src/remove-duplicates.pg.test.ts`를 실행하면 실제 CLI의
기본 dry-run·데이터 보존·충돌·쓰기 단계별 롤백·재실행을 검증한다. 테스트는 실제 Tier SQL을
적용하고 fixture 테이블을 삭제하므로 운영 DB나 다른 테스트의 DB를 사용하지 않는다.
로컬 일반 `pnpm --filter tier-web test`에서는 환경변수가 없으면 이 DB suite를 건너뛴다.

PR CI와 TierWeb build는 PostgreSQL 17에 별도 빈 `darun_tier_dedupe` DB를 만들고,
다음 필수 명령에만 URL을 전달한다. GraphQL fixture DB와 공유하지 않는다.
TierWeb은 공개 빌드 변수를 확인하기 전에 DB 회귀를 실행하므로 빌드 설정 누락이 DB 검사까지 건너뛰게 하지 않는다.
`deploy=false`의 빌드 전용 실행은 공개 변수가 없을 때 PR CI와 같은 합성 설정을 사용한다.
`deploy=true`에는 이 기본값을 사용하지 않으며 실제 공개 변수 누락 시 빌드·배포를 차단한다.
실제 배포 job도 기존처럼 실제 변수와 자격 증명을 확인한 뒤 별도로 빌드한다.

```bash
REQUIRED_POSTGRES_GROUP=tier DEDUPE_TEST_DATABASE_URL=<isolated-db-url> pnpm --filter tier-web exec vitest run src/remove-duplicates.pg.test.ts --reporter=default --reporter="$PWD/apps/graphql-api/scripts/required-postgres-reporter.ts"
```

저장소 루트에서 실행한다. 필수 reporter는 URL 누락·suite 미수집·0개 실행·skip·실패를
오류로 처리하고 실제 실행 수와 skipped 수를 로그에 남긴다. TierWeb의 deploy는 build가
성공해야 시작하므로 이 검증 실패 시 Cloudflare 배포로 진행하지 않는다.

### 원자적 티어 변경 전제

`0002_atomic_tiers.sql`은 기존 마이그레이션 이후 적용하는 전방 전용 변경이다. 배포 전에 별도 승인된 DB 백업과 격리 DB 검증이 필요하며, 앱 코드보다 먼저 적용한다. 자동 실행하거나 기존 마이그레이션을 다시 적용하지 않는다.

- 같은 앱의 중복 티어는 `assigned_at DESC NULLS LAST, id DESC` 순서의 첫 행만 유지한다. 삭제되는 이전 할당의 메모까지 필요하면 적용 전 `tiers` 전체를 별도 보관한다. 동률은 UUID 내림차순으로 결정하며, 이 순서는 생성 시각을 뜻하지 않는다.
- 기존 티어가 0~3 밖이면 전체 트랜잭션을 중단한다. 값을 임의로 바꾸지 않으며 담당자가 데이터를 확인·수정한 뒤 다시 적용한다.
- 테이블 잠금, 중복 정리, UNIQUE/CHECK와 두 FK의 CASCADE 변경이 한 트랜잭션에서 수행된다. 적용 도구가 SQL을 개별 트랜잭션으로 분할하지 않아야 한다. 기존 FK 이름은 앞선 두 마이그레이션과 같아야 한다.
- `tiers.app_id` 유일 제약으로 동시 변경은 단일 upsert가 되고, 티어 없음도 0으로 저장한다. 앱 삭제는 부모 DELETE 한 문장이며 티어·메모는 DB에서 함께 삭제한다. 기존 RLS 정책은 유지되므로 관리자에게 부모 DELETE 및 티어 INSERT/UPDATE 권한이 필요하다.
- 티어 없음 목록은 PostgREST의 별칭 임베드 anti-join을 사용한다. 격리 PostgREST에서 명시적 0과 미할당 앱이 이름·ID 순서로 섞여 24개씩 반환되는지 확인한다. 정렬은 DB 기준이며 클라이언트에서 다시 정렬하지 않는다. 조회 중 데이터 자체가 변경되는 경우 offset 페이지의 스냅샷 일관성을 보장하지는 않는다.

Drizzle journal/snapshot은 스키마와 이 전방 SQL에 맞춰 생성·검토한 뒤 함께 배포한다. 운영 DB 마이그레이션과 배포는 별도 승인 대상이다.

### 원자적 메모 저장 전제

`0003_atomic_memos.sql`은 기존 `0000`~`0002` 적용 후 메모의 `app_id` 유일 제약을 추가한다.
기존 migration은 다시 실행하지 않으며, 운영 적용과 Tier 웹 배포는 별도 승인된 유지보수 시간에 이어서 진행한다.
구버전 관리 화면은 새 PostgREST 관계 형식을 읽지 못하므로 전환 중 메모 편집을 중단한다.

기존 Supabase SQL Editor 등 수동 적용 DB는 이 경로를 그대로 사용한다. **`0003` 파일 전체 내용의
마지막에 `COMMIT;`을 덧붙여 한 번의 실행으로 보낸다.** 파일의 `BEGIN`부터 이 마지막 commit까지
같은 연결·transaction을 유지해야 하며, 문장별로 분할하거나 파일만 실행한 뒤 연결을 닫으면 안 된다.
파일 자체에는 Drizzle의 이력 기록을 먼저 commit하지 않도록 최종 `COMMIT`을 넣지 않는다.
이미 DB Drizzle journal로 관리하는 환경에서 migrator를 사용할 때는 수동 `COMMIT`을 덧붙이지 않는다.
저장소의 snapshot/journal 파일이 있다는 이유만으로 수동 적용 DB에 DB journal이 있다고 가정하거나,
`drizzle-kit migrate`로 초기 DDL부터 재실행·자동 baseline하지 않는다.

중복 메모가 있으면 `Duplicate app memos` 오류로 중단하며 본문을 삭제·병합하지 않는다.
SQL 도구가 실패한 연결을 유지하면 `ROLLBACK;`으로 transaction을 종료한 뒤, 담당자가 내용을
보존·대조해 충돌을 명시적으로 해결하고 다시 적용한다. 성공한 SQL은 반복 적용하지 않는다.
이후 관리자 목록은 새 단일 객체/null 응답과 schema cache 갱신 전의 기존 배열 응답을 모두 읽는다.
기존 관리자에게 메모 INSERT/UPDATE/DELETE 권한이 필요하며 RLS 정책은 바꾸지 않는다.

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
