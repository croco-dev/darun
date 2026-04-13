# E2E 테스트

이 프로젝트는 Playwright를 사용한 E2E(End-to-End) 테스트를 지원합니다.

## 사전 준비

### 1. E2E 테스트용 데이터베이스 시드

```bash
pnpm --filter graphql-api seed:e2e
```

이 명령은 E2E 테스트에 필요한 고정 픽스처 데이터를 생성합니다:

- `darun-product`: 대안이 없는 테스트 상품
- `figma-e2e`: 대안 3개 이상 보유 (sketch-e2e, adobe-xd-e2e, invision-e2e)
- `sketch-e2e`: 비교 가능한 메타데이터 보유
- `notion-e2e-01` ~ `notion-e2e-32`: rankedProducts용 32개 상품
- `intro-e2e`: 매거진 1건
- 테스트 계정: `test@darun.io` (Firebase Auth emulator)

### 2. Playwright 브라우저 설치 (최소 1회)

```bash
pnpm --filter service-web e2e:install
```

## E2E 테스트 실행

### 전체 테스트 실행

```bash
pnpm --filter service-web e2e
```

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

## 테스트 구조

```
apps/service-web/tests/
├── helpers/
│   └── auth-mock.ts      # 인증 Mock 헬퍼
├── *.spec.ts             # 테스트 파일
└── .gitkeep
```

## Firebase Auth Emulator 연동

로컬 개발 시 Firebase Auth Emulator를 사용합니다:

```bash
firebase emulators:start --only auth
```

`tests/helpers/auth-mock.ts`의 `loginAs()` 함수를 사용하여 테스트 중 인증 상태를 설정할 수 있습니다.

## 환경 변수

| 변수           | 설명                | 기본값                  |
| -------------- | ------------------- | ----------------------- |
| `BASE_URL`     | 테스트 대상 URL     | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL 연결 URL | -                       |

## CI/CD

GitHub Actions 등에서 실행 시:

```bash
# CI 환경에서는 브라우저 자동 설치
pnpm --filter service-web exec playwright install --with-deps chromium

# 테스트 실행
pnpm --filter service-web e2e
```
