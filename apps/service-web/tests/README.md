# E2E 테스트

이 프로젝트는 Playwright를 사용한 E2E(End-to-End) 테스트를 지원합니다.

## 사전 준비

### Playwright 브라우저 설치 (최소 1회)

```bash
pnpm --filter service-web e2e:install
```

---

## E2E 테스트 실행 방법

테스트 실행 방법은 **Compose 모드 (권장)** 와 **Standalone 모드** 두 가지가 있습니다.

### 1. Compose 모드 (권장)

E2E는 일반 개발 환경과 별도 Compose 프로젝트·볼륨을 사용합니다. 같은 포트를 쓰는 개발 컨테이너가 실행 중이면 먼저 중지하세요. 기존 개발 볼륨을 삭제하지 않습니다.

1. **전용 PostgreSQL·MongoDB·Firebase Auth Emulator 시작**:
   ```bash
   docker compose -p darun-e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d postgres mongo firebase-auth
   ```
2. **전용 PostgreSQL DB에 migration 적용** (재실행 가능):
   ```bash
   DATABASE_URL=postgresql://darun:darun@localhost:5432/darun_e2e pnpm --filter graphql-api migrate
   ```
   `local:bootstrap`은 기존 개발 DB를 초기화하므로 E2E 준비에 사용하지 않습니다.
3. **고정 fixture 생성·복원**:
   ```bash
   DATABASE_URL=postgresql://darun:darun@localhost:5432/darun_e2e \
   MONGODB_URI='mongodb://darun:darun@localhost:27017/darun?authSource=admin' \
   pnpm --filter graphql-api seed:e2e
   ```
   시드는 PostgreSQL의 `darun_e2e`와 로컬 MongoDB의 `darun`만 허용합니다. MongoDB는 API가 사용하는 DB 이름을 유지하며 별도 Compose 볼륨으로 격리합니다. 연결 URL은 자동으로 `.env`에서 읽지 않습니다.
4. **API와 웹 시작**:
   ```bash
   docker compose -p darun-e2e -f docker-compose.yml -f docker-compose.e2e.yml up -d graphql-api service-web
   ```
5. **테스트 실행**:
   ```bash
   pnpm --filter service-web e2e
   ```
   Playwright는 실행 중인 웹을 사용합니다. 전체 smoke의 검색 경로에는 `searchable_products_index`를 제공하는 MongoDB Search가 필요합니다. 현재 기본 `mongo:8` Compose에는 이 검색 엔진이 없으며, 검색 문서를 시드하는 것만으로 `$search`가 준비되지는 않습니다. 로컬 검색 환경 구성은 #476, CI smoke 필수화는 #468에서 다룹니다.

### 2. Standalone 모드
Docker Compose를 사용하지 않고 로컬 호스트 환경에서 직접 독립 실행하는 방법입니다.

1. **Firebase Auth Emulator 수동 실행**:
   E2E 테스트의 사용자 인증을 위해 Firebase Auth Emulator를 직접 시작해야 합니다.
   ```bash
   firebase emulators:start --only auth
   ```
2. **테스트 실행**:
   Playwright가 내부 설정(`webServer` config)에 따라 로컬에서 `service-web` 서버를 직접 구동하고 E2E 테스트를 수행합니다.
   ```bash
   pnpm --filter service-web e2e
   ```

---

## E2E 테스트용 시드 데이터 정보

전용 DB 환경변수를 지정한 `pnpm --filter graphql-api seed:e2e` 명령은 E2E 테스트에 필요한 다음 고정 픽스처 데이터를 생성합니다:

- `darun-product`: 대안이 없는 테스트 상품
- `figma-e2e`: 대안 3개 이상 보유 (sketch-e2e, adobe-xd-e2e, invision-e2e)
- `sketch-e2e`: 비교 가능한 메타데이터 보유
- `notion-e2e-01` ~ `notion-e2e-32`: rankedProducts용 32개 상품
- `intro-e2e`: 매거진 1건
- 테스트 계정·저장 관계: 시드에서 생성하지 않으며 `tests/helpers/auth-mock.ts`의 Firebase Auth emulator 헬퍼로 준비합니다.

시드는 고정 slug의 이름·본문·발행 상태와 투표(랭킹 fixture는 1~32), outgoing 대안 관계를 복원합니다. fixture 외 상품·투표·대안·검색 문서는 보존합니다. 기존 fixture ID는 유지하며, 같은 ID의 검색 문서를 직접 갱신합니다. SQL 쓰기는 한 transaction이고 MongoDB 갱신은 그 이후입니다. 중간 검색 저장 실패 시 명령이 실패하며 재실행으로 복구합니다. 운영 worker·번역·LLM은 실행하지 않습니다. 검색 인덱스는 만들지 않습니다.

시드 회귀는 **빈 전용 PostgreSQL/MongoDB**에서 실행합니다. 이미 `products` 테이블이나 검색 문서가 있으면 테스트가 중단됩니다.

```bash
E2E_SEED_TEST_DATABASE_URL=postgresql://darun:darun@localhost:5432/darun_e2e \
E2E_SEED_TEST_MONGODB_URI='mongodb://darun:darun@localhost:27017/darun?authSource=admin' \
pnpm --filter graphql-api exec vitest run __tests__/seedE2e.pg.test.ts
```

---

## 다양한 테스트 실행 명령어

### UI 모드로 실행

```bash
pnpm --filter service-web exec playwright test --ui
```

### 특정 테스트 파일 실행

```bash
pnpm --filter service-web exec playwright test tests/example.spec.ts
```

### 디버그 모드로 실행

```bash
pnpm --filter service-web exec playwright test --debug
```

---

## 테스트 구조

```
apps/service-web/tests/
├── helpers/
│   └── auth-mock.ts      # 인증 Mock 헬퍼
├── *.spec.ts             # 테스트 파일
└── .gitkeep
```

---

## Firebase Auth Emulator 연동

E2E 테스트 실행 시 Firebase Auth Emulator를 사용합니다. 
- **Compose 모드**에서는 `pnpm local:up` 수행 시 Docker 컨테이너 내에서 Firebase Auth Emulator가 포트 `9099`로 자동 구동됩니다.
- **Standalone 모드**에서는 로컬 머신에서 `firebase emulators:start --only auth` 명령어로 직접 실행해야 합니다.

`tests/helpers/auth-mock.ts`의 `loginAs()` 함수를 사용하여 테스트 중 인증 상태를 설정할 수 있습니다.

---

## 환경 변수

| 변수           | 설명                | 기본값                  |
| -------------- | ------------------- | ----------------------- |
| `BASE_URL`     | 테스트 대상 URL     | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL 연결 URL | -                       |

---

## CI/CD

GitHub Actions 등에서 실행 시:

```bash
# CI 환경에서는 브라우저 자동 설치
pnpm --filter service-web exec playwright install --with-deps chromium

# 테스트 실행
pnpm --filter service-web e2e
```
