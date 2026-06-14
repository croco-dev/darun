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
Docker Compose 기반의 전체 로컬 개발 환경에서 테스트를 실행하는 방법입니다.

1. **로컬 개발 환경 및 서비스 시작**:
   `postgres`, `mongo`, `firebase-auth` (Firebase Auth Emulator), `graphql-api`, `service-web` 등의 모든 서비스가 포함된 컨테이너가 시작됩니다.
   ```bash
   pnpm local:up
   ```
2. **PostgreSQL 데이터베이스 초기화 (최초 1회 또는 마이그레이션 변경 시)**:
   ```bash
   pnpm local:bootstrap
   ```
3. **E2E 테스트용 데이터베이스 시드**:
   E2E 테스트에 필요한 고정 픽스처 데이터를 생성합니다.
   ```bash
   pnpm --filter graphql-api seed:e2e
   ```
4. **테스트 실행**:
   Playwright는 이미 실행 중인 `service-web` 컨테이너에 자동으로 연결됩니다 (`playwright.config.ts`의 `reuseExistingServer: !process.env.CI` 속성 덕분).
   ```bash
   pnpm --filter service-web e2e
   ```

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

`pnpm --filter graphql-api seed:e2e` 명령은 E2E 테스트에 필요한 다음 고정 픽스처 데이터를 생성합니다:

- `darun-product`: 대안이 없는 테스트 상품
- `figma-e2e`: 대안 3개 이상 보유 (sketch-e2e, adobe-xd-e2e, invision-e2e)
- `sketch-e2e`: 비교 가능한 메타데이터 보유
- `notion-e2e-01` ~ `notion-e2e-32`: rankedProducts용 32개 상품
- `intro-e2e`: 매거진 1건
- 테스트 계정: `test@darun.io` (Firebase Auth emulator)

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
