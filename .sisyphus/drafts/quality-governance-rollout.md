# Coverage / Performance Governance Rollout

**Status:** Draft  
**Scope:** PR CI (`PullRequest.yaml`) + 별도 성능 측정 workflow  
**Out of scope:** 실제 threshold 강제 구현, Lighthouse CI 즉시 연결

---

## Current State

| Area | Status |
|------|--------|
| Test runner | Vitest 4 + v8 coverage provider (설정만 존재) |
| Coverage threshold | 없음 |
| Coverage reporter | 없음 (upload 정책 없음) |
| Performance budget | 없음 |
| Bundle analyzer | 없음 |
| Lighthouse CI | 없음 |
| Web Vitals 측정 | 없음 |
| PR CI steps | lint → typecheck → test → build (Task 5에서 build 추가됨) |
| Sentry tracesSampleRate | 0.1 (Task 6에서 1.0 → 0.1로 조정됨) |

테스트 인프라는 있지만 "테스트가 회귀를 방지하는 저장소"가 되려면 coverage 거버넌스가 필요하다. 성능도 Sentry로 런타임 관측은 되지만 CI에서 회귀를 막는 장치가 없다.

---

## 1. Coverage Rollout

### 현재 설정 구조

`vitest.workspace.ts`는 단일 프로젝트로 구성되어 있고, `vitest.config.ts`를 extends한다. v8 coverage provider는 이미 의존성에 포함되어 있다.

```
vitest.workspace.ts
  └── extends: ./vitest.config.ts
        └── test.projects[0]: apps/*/__tests__, libs/*/domain/src, ...
```

### 단계적 threshold 도입 전략

threshold를 처음부터 높게 설정하면 기존 코드베이스에서 즉시 CI가 깨진다. 낮은 값에서 시작해 점진적으로 올리는 방식이 현실적이다.

**Phase 1 (즉시 적용 가능): 최소 기준선**

```ts
// vitest.config.ts에 추가
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: {
    lines: 10,
    functions: 10,
    branches: 10,
    statements: 10,
  },
}
```

낮은 threshold는 "현재 상태보다 나빠지면 실패"하는 회귀 방지선 역할을 한다. 실제 커버리지가 이미 10% 이상이라면 CI는 통과하면서 기준선이 생긴다.

**Phase 2 (1~2 스프린트 후): 핵심 도메인 집중**

전체 threshold를 올리기보다 핵심 도메인 라이브러리에 per-file 또는 per-directory threshold를 적용한다.

```ts
thresholds: {
  lines: 20,
  functions: 20,
  // 핵심 도메인은 별도 설정 검토
}
```

**Phase 3 (안정화 후): 목표 수준**

팀이 합의한 목표 수준(예: lines 60%, functions 70%)으로 점진적 상향. 새 코드에 대한 diff coverage 도구(예: `vitest --coverage.include` 패턴 활용)를 병행하면 기존 코드 부채와 신규 코드 기준을 분리할 수 있다.

### Reporter 설정

| Reporter | 용도 |
|----------|------|
| `text` | CI 로그에서 즉시 확인 |
| `lcov` | Codecov / Coveralls 업로드용 |
| `html` | 로컬 상세 분석용 (CI artifact로 저장 가능) |

### Coverage Upload 방안

GitHub Actions에서 Codecov를 사용하는 경우:

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: false  # 초기에는 soft fail
```

`fail_ci_if_error: false`로 시작해 업로드 파이프라인이 안정화된 후 `true`로 전환한다.

---

## 2. Performance Metric Choice

### Web Vitals vs Lighthouse CI

| 항목 | Web Vitals (RUM) | Lighthouse CI |
|------|-----------------|---------------|
| 측정 시점 | 실제 사용자 브라우저 | CI 빌드 시 headless |
| 데이터 품질 | 실제 네트워크/기기 반영 | 통제된 환경, 재현 가능 |
| CI 통합 | 어려움 (별도 수집 인프라 필요) | 쉬움 (GitHub Actions action 존재) |
| 회귀 방지 | 사후 감지 | 사전 차단 가능 |
| 설정 비용 | 높음 | 낮음 |
| 노이즈 | 낮음 (실제 데이터) | 높음 (환경 변동) |

### 추천 접근법

**단기: Lighthouse CI**를 PR에서 informational로 실행한다. 점수를 fail 조건으로 쓰지 않고 PR comment로 리포트만 남긴다. 이렇게 하면 CI 시간 증가 없이 성능 가시성을 확보할 수 있다.

**중기: Web Vitals + Sentry 연동**을 강화한다. Sentry의 Performance 기능은 이미 연결되어 있고, Task 6에서 `tracesSampleRate`를 0.1로 낮춘 덕분에 비용 부담 없이 핵심 트랜잭션을 샘플링할 수 있다. Sentry Performance 대시보드에서 LCP, FCP, TTFB 트렌드를 모니터링하는 것이 Web Vitals 별도 인프라 없이 가장 빠른 경로다.

**장기: 번들 크기 예산**을 PR에서 확인한다. `@next/bundle-analyzer` 또는 `bundlesize` 패키지로 주요 청크 크기에 예산을 설정하고, 초과 시 PR을 차단한다.

---

## 3. CI Sequencing

### 현재 PR gate (Task 5 이후)

```
lint → typecheck → test → build
```

### Coverage minimum 추가

coverage threshold는 `test` 단계에 포함된다. Vitest의 `--coverage` 플래그를 추가하면 threshold 미달 시 exit code가 1이 되어 CI가 실패한다.

```yaml
- run: pnpm run test
# 변경 후:
- run: pnpm run test --coverage
```

또는 `package.json`의 test 스크립트에 `--coverage`를 포함시키는 방식이 더 명시적이다.

```json
"test:ci": "vitest run --coverage"
```

### 성능 측정 workflow 설계

성능 측정은 PR gate와 분리하는 것이 좋다. 이유는 두 가지다.

1. Lighthouse CI는 실행 시간이 길다 (앱 빌드 + headless 브라우저 실행).
2. 성능 점수는 환경 변동이 크기 때문에 초기에는 hard fail 조건으로 쓰기 어렵다.

**권장 구조:**

```
PullRequest.yaml (기존 gate)
  lint → typecheck → test --coverage → build

Performance.yaml (별도 workflow, 선택적)
  on: pull_request (또는 push to trunk)
  build → lighthouse-ci (informational only)
```

별도 workflow로 분리하면 성능 측정이 느려도 PR merge를 막지 않는다. 성능 회귀가 명확해지면 그때 fail 조건을 추가한다.

### 단계별 CI 진화 경로

| 단계 | PR gate | 성능 측정 |
|------|---------|-----------|
| 현재 | lint, typecheck, test, build | 없음 |
| Phase 1 | + coverage (soft threshold) | 없음 |
| Phase 2 | + coverage (실질 threshold) | Lighthouse CI (informational) |
| Phase 3 | + bundle size check | Lighthouse CI (hard fail 일부) |

---

## 4. Task 5/6 연결: 관측성 거버넌스

### Task 5: PR build gate 추가

`PullRequest.yaml`에 build 단계가 추가되었다. 이는 coverage와 성능 측정의 전제 조건이다. coverage는 test 단계에서 수집되고, Lighthouse CI는 build 결과물을 대상으로 실행된다. build gate가 없으면 두 측정 모두 의미가 없다.

### Task 6: Sentry tracesSampleRate 0.1 조정

`tracesSampleRate: 1.0`은 모든 트랜잭션을 Sentry로 전송한다. 트래픽이 늘면 Sentry 비용이 선형으로 증가하고, 노이즈도 많아진다.

0.1로 낮추면 두 가지 효과가 있다.

1. **비용 절감**: 10%만 샘플링하므로 트래픽 증가에도 Sentry 이벤트 수가 통제된다.
2. **관측성 거버넌스 기반**: 샘플링 비율을 명시적으로 관리하는 것 자체가 거버넌스다. 나중에 특정 트랜잭션만 100% 샘플링하는 `tracesSampler` 함수로 전환할 때 이 설정이 출발점이 된다.

성능 거버넌스 관점에서 Sentry Performance는 "실제 사용자 데이터 기반 Web Vitals 모니터링"의 가장 빠른 경로다. Lighthouse CI가 CI 환경의 통제된 측정이라면, Sentry는 프로덕션 실제 데이터다. 두 접근법은 상호 보완적이다.

---

## 5. Risks

### Coverage threshold가 개발 속도를 저해할 가능성

threshold를 너무 높게 설정하거나 너무 빨리 올리면 개발자가 "테스트를 위한 테스트"를 작성하게 된다. `expect(1).toBe(1)` 수준의 테스트가 이미 존재하는 것이 이 위험의 선행 신호다.

**완화 방안:**
- Phase 1은 현재 커버리지보다 낮은 threshold로 시작 (회귀 방지만)
- threshold 상향은 팀 합의 후 진행
- diff coverage 도구로 신규 코드에만 높은 기준 적용 검토

### Performance gate가 CI 시간을 증가시킬 가능성

Lighthouse CI는 앱 빌드 + headless 브라우저 실행이 필요하다. service-web 기준으로 Next.js 빌드만 2~3분, Lighthouse 실행이 1~2분 추가된다.

**완화 방안:**
- 성능 측정은 별도 workflow로 분리 (PR merge를 막지 않음)
- 초기에는 `trunk` push 시에만 실행 (PR마다 실행하지 않음)
- Lighthouse CI 대신 `@next/bundle-analyzer`로 번들 크기만 먼저 측정 (빠름)

### 모노레포 특성상 coverage 집계 복잡성

`vitest.workspace.ts`는 단일 프로젝트로 구성되어 있지만, 실제로는 여러 앱과 라이브러리를 포함한다. coverage를 앱별/라이브러리별로 분리할지, 전체 합산으로 볼지 결정이 필요하다.

**완화 방안:**
- 초기에는 전체 합산 threshold로 시작 (단순함 우선)
- 특정 라이브러리가 threshold를 끌어내리면 그때 per-package 설정 검토

---

## 참고: 현재 테스트 파일 분포

- 전체 테스트 파일: 약 16개
- 대부분 smoke/setup 수준
- Playwright spec: 0개 (설정만 존재)
- 통합 테스트: 없음

coverage threshold를 도입하기 전에 핵심 도메인 1~2곳의 실질 테스트를 먼저 늘리는 것이 threshold 수치를 의미 있게 만드는 선행 조건이다.
