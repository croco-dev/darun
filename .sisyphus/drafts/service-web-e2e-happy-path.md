# service-web Playwright Happy-Path 실행 설계

> 작성일: 2026-04-21
> 대상 앱: `apps/service-web` (Next.js 15, `@playwright/test` 1.59.1)
> 선정 시나리오: **홈 진입 → 상품 상세 페이지 탐색**

---

## Preconditions

### 1. Seed 데이터

```bash
pnpm --filter graphql-api seed:e2e
```

이 명령이 생성하는 픽스처 중 이 시나리오에 필요한 항목:

| 픽스처 slug | 용도 |
|---|---|
| `figma-e2e` | 상품 상세 페이지 탐색 대상 (대안 3개 이상 보유) |
| `notion-e2e-01` ~ `notion-e2e-32` | 홈 TrendingProductSection / RankedProducts 렌더링 확인 |

### 2. Firebase Auth Emulator

```bash
firebase emulators:start --only auth
```

- 에뮬레이터 URL: `http://localhost:9099`
- 테스트 계정: `test@darun.io` (uid: `e2e-test-uid`)
- `tests/helpers/auth-mock.ts`의 `loginAs()` 함수로 쿠키(`__darun_session`) 주입

이 시나리오는 비로그인 상태에서도 홈과 상품 상세를 탐색할 수 있으므로, 인증은 선택적 전제 조건이다. 단, 로그인 후 상태 변화(북마크, 투표 버튼 노출 등)를 검증하려면 에뮬레이터가 필요하다.

### 3. 환경 변수

| 변수 | 기본값 | 비고 |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | `playwright.config.ts`에서 읽음 |
| `DATABASE_URL` | (없음) | GraphQL API 서버가 별도 실행 중이어야 함 |

### 4. 서버 기동 상태

- `pnpm --filter service-web dev` (포트 3000) 또는 `pnpm --filter service-web start`
- `playwright.config.ts`의 `webServer` 설정이 `reuseExistingServer: !process.env.CI`이므로, 로컬에서는 서버를 미리 띄워도 된다.
- CI에서는 Playwright가 자동으로 `pnpm --filter service-web dev`를 실행한다.

---

## Candidate Flow

**시나리오: 홈 진입 후 상품 상세 페이지 탐색**

```
1. BASE_URL(/) 접속
   └─ 미들웨어가 /ko 로 301 리다이렉트
2. /ko 홈 페이지 렌더링 확인
   └─ MainHeroBanner, TrendingProductSection 노출 확인
3. TrendingProductSection 또는 검색에서 "figma-e2e" 상품 링크 클릭
   └─ /ko/products/figma-e2e 로 이동
4. 상품 상세 페이지 렌더링 확인
   └─ 상품명, 대안 목록(sketch-e2e 등) 노출 확인
5. (선택) 대안 탭 클릭 → /ko/products/figma-e2e/alternatives 이동
   └─ 대안 3개 이상 렌더링 확인
```

이 흐름을 선정한 이유:
- 비로그인 상태에서 실행 가능해 Firebase Auth 에뮬레이터 없이도 기본 동작 검증 가능
- `figma-e2e` 픽스처가 대안을 보유하므로 상품 상세의 핵심 기능(대안 비교)까지 커버
- 홈 → 상세 이동이 가장 빈번한 사용자 경로

---

## Required Data

### Seed 픽스처 (graphql-api)

| 항목 | 값 | 출처 |
|---|---|---|
| 상품 slug | `figma-e2e` | `seed:e2e` 명령 |
| 대안 slug 목록 | `sketch-e2e`, `adobe-xd-e2e`, `invision-e2e` | `seed:e2e` 명령 |
| 랭킹용 상품 | `notion-e2e-01` ~ `notion-e2e-32` | `seed:e2e` 명령 |

### 테스트 계정 (선택)

| 항목 | 값 |
|---|---|
| 이메일 | `test@darun.io` |
| uid | `e2e-test-uid` |
| 쿠키 이름 | `__darun_session` |

---

## Selectors to Verify

코드 근거(`app/[locale]/page.tsx`, `auth-mock.ts`)를 기반으로 한 selector 후보:

### 홈 페이지 (`/ko`)

| 검증 항목 | Selector | 근거 |
|---|---|---|
| 홈 히어로 배너 | `[data-testid="home-hero"]` | `app/[locale]/page.tsx` line 33 |
| 페이지 타이틀 | `document.title` 또는 `h1` | 홈 레이아웃 |
| 상품 카드 목록 | `[data-testid="trending-product-section"]` (추정) | `TrendingProductSection` 컴포넌트 |

> `data-testid="home-hero"`는 코드에서 직접 확인된 유일한 selector다. 나머지는 `@darun/products-shell` 내부 구현을 확인 후 확정해야 한다.

### 상품 상세 페이지 (`/ko/products/figma-e2e`)

| 검증 항목 | Selector | 근거 |
|---|---|---|
| 상품명 노출 | `h1` 또는 `[data-testid="product-name"]` | `ProductDetailPage` 컴포넌트 (추정) |
| JSON-LD 스크립트 | `script[type="application/ld+json"]` | `app/[locale]/products/[slug]/page.tsx` line 161 |
| 대안 섹션 | `[data-testid="alternatives"]` (추정) | `@darun/pages-shell` 내부 |

> `script[type="application/ld+json"]`은 코드에서 직접 확인된 selector다. 나머지는 `@darun/pages-shell` 내부 구현 확인 후 확정해야 한다.

### 리다이렉트 검증

| 검증 항목 | 방법 |
|---|---|
| `/` → `/ko` 301 리다이렉트 | `page.url()`이 `/ko`로 끝나는지 확인 |

---

## Exit Criteria

이 E2E 테스트가 통과하면 다음이 보장된다:

1. **미들웨어 정상 동작**: `/` 접속 시 `/ko`로 리다이렉트된다.
2. **홈 페이지 렌더링**: `[data-testid="home-hero"]`가 DOM에 존재한다.
3. **GraphQL API 연결**: 홈 페이지가 `productsCount` 쿼리를 성공적으로 실행한다 (히어로 배너에 숫자 노출).
4. **상품 상세 라우팅**: `/ko/products/figma-e2e` 접속 시 404가 아닌 정상 페이지가 반환된다.
5. **JSON-LD 삽입**: 상품 상세 페이지에 `script[type="application/ld+json"]`이 존재한다.
6. **seed 데이터 연동**: `figma-e2e` 상품이 GraphQL API를 통해 정상 조회된다.

---

## 구현 시 주의사항

- `playwright.config.ts`의 `testDir`은 `./tests`이므로 spec 파일은 `apps/service-web/tests/` 아래에 위치해야 한다.
- CI에서는 `workers: 1`로 직렬 실행된다.
- `BASE_URL` 환경변수를 설정하지 않으면 `http://localhost:3000`이 기본값이다.
- `@darun/products-shell`, `@darun/pages-shell` 내부의 `data-testid` 속성은 해당 라이브러리 코드를 직접 확인한 후 selector를 확정해야 한다.
- `tests/helpers/auth-mock.ts`의 `loginAs()` 함수는 Firebase Auth Emulator가 없을 경우 `mock-e2e-token`을 반환하므로, 인증이 필요한 기능 테스트 시 에뮬레이터 기동이 필수다.
