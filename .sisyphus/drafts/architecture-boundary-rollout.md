# boundaries/products 허브 개선 실행 설계

> 작성일: 2026-04-21
> 대상 범위: `libs/products/*`, `libs/search/*`, 루트 ESLint boundaries 설정
> 목적: products 허브 결합을 줄인 뒤 `boundaries/element-types`를 점진적으로 활성화하기 위한 실행 순서 정의

---

## Current violations

현재 상태는 boundaries 규칙이 루트 `eslint.config.mjs`에서는 `error`로 선언되어 있어도, 공통 설정의 legacy selector와 다수 예외 import 때문에 실제 집행력이 약한 상태다. 즉시 전역 강제로 전환하면 기존 결합이 한 번에 터져 개발 흐름을 멈출 가능성이 높다.

### 확인된 위반/우회 목록

1. `products-feature → companies-feature/server`
2. `products-feature → translation-feature/server`
3. `products-domain → voting-domain`
4. `products-domain → images-domain`
5. `search-shell → products-shell`
6. `feature → datasource` 직접 참조
7. `products/feature → products/ui` 역방향 의존
8. `libs/products/domain/src/usecases/GetRankedProducts.ts`의 `// eslint-disable-next-line boundaries/element-types` 우회

### 왜 지금 바로 error enforcement를 걸면 안 되는가

- `libs/products/domain`이 voting, images 같은 다른 도메인에 직접 의존하는 허브 역할을 하고 있다.
- `products-feature`는 companies/translation feature server를 직접 호출하면서 feature 간 결합을 만들고 있다.
- `search-shell → products-shell`처럼 shell 간 결합도 존재해, 현재 규칙을 일괄 강제하면 수정 범위가 `products` 밖으로 바로 확산된다.
- `GetRankedProducts.ts`는 첫 줄에서 규칙을 직접 우회하고 있어, 현 상태의 lint 통과가 “문제가 없다”는 뜻이 아니라 “예외가 이미 누적되었다”는 증거다.

---

## Sequencing

활성화 순서는 반드시 **분해 → 예외 축소 → 규칙 활성화** 순서를 따른다.

### 1. 분해

우선 products 허브가 직접 끌어오는 책임을 경계별로 분리한다.

- `products-domain → voting-domain`, `products-domain → images-domain` 직접 의존을 식별하고 포트/조회 전용 인터페이스 또는 상위 조합 계층으로 이동할 후보를 정리한다.
- `products-feature → companies-feature/server`, `products-feature → translation-feature/server`는 feature 간 직접 호출 대신 상위 조합 계층 또는 API 경유 흐름으로 이동할 대상 목록을 만든다.
- `search-shell → products-shell` 결합은 shell 간 직접 조합 대신 route/app-local composition으로 이동 가능한 경계를 명시한다.
- `feature → datasource` 직접 참조와 `products/feature → products/ui` 역방향 의존은 레이어 방향성 기준으로 역전 포인트를 목록화한다.

이 단계의 산출물은 “무엇을 어떻게 옮길지”에 대한 매핑이며, 아직 lint를 강제로 깨지 않는다.

### 2. 예외 축소

분해 후보가 정리되면 기존 우회와 예외를 줄인다.

- `GetRankedProducts.ts`의 `boundaries/element-types` disable 주석은 가장 먼저 제거 후보로 추적한다.
- legacy selector에 기대는 shared boundaries 설정은 새 경계 정의와 충돌하는 예외를 문서화한다.
- 신규 위반은 추가하지 못하도록 변경 리뷰 기준을 세우고, 기존 위반은 파일 단위로 감소 추세를 만든다.

이 단계의 목표는 “남은 위반이 의도적으로 관리되고 있다”는 상태를 만드는 것이다.

### 3. 규칙 활성화

예외가 충분히 줄어든 뒤에만 boundaries를 점진적으로 활성화한다.

- 먼저 `products`, `search`처럼 문제 범위가 명확한 라이브러리만 대상으로 삼는다.
- 신규/수정 파일 우선으로 enforcement를 켠다.
- 마지막에만 공통 설정과 루트 설정을 맞춰 저장소 기본값으로 승격한다.

---

## Temporary guardrails

### 원칙

- **즉시 lint 강제 금지**: 지금 당장 전체 저장소를 `boundaries/element-types` 실패로 막지 않는다.
- **점진적 활성화**: 변경이 집중되는 라이브러리와 신규 수정 파일부터 제한적으로 적용한다.
- **기존 위반과 신규 위반을 분리 관리**: 당장 다 고치지 못하더라도 새 예외가 늘어나는 것은 막는다.

### 단기 가드레일

1. 문서에 적힌 현재 위반 목록을 baseline으로 취급하고, 동일 유형의 신규 cross-layer / cross-feature import는 추가 금지한다.
2. `boundaries/element-types` disable 주석은 신규 추가를 금지하고, 기존 주석은 제거 후보 목록으로만 관리한다.
3. lint 설정 변경은 warning 또는 제한된 target 범위에서만 시작하고, 전체 저장소 error enforcement는 보류한다.
4. 빈 `service` 레이어가 있는 라이브러리는 단순히 레이어를 늘리는 방식으로 예외를 숨기지 않는다.

### 하지 말아야 할 것

- products 허브 분해 전에 전체 저장소를 한 번에 error enforcement로 전환하는 계획
- 현재 위반을 무시한 채 “lint가 막아주니 이후에 정리하면 된다”는 접근
- feature 간 직접 참조를 다른 임시 import 경로로만 바꾸는 우회성 수정

---

## Activation criteria

아래 조건이 충족될 때만 boundaries를 `error` 중심 집행으로 전환한다.

### 필수 조건

1. `products-domain → voting-domain`, `products-domain → images-domain` 직접 의존의 대체 경로가 정의되었거나 제거되었다.
2. `products-feature → companies-feature/server`, `products-feature → translation-feature/server` 직접 참조가 상위 조합 계층 또는 명시된 인터페이스 경로로 축소되었다.
3. `search-shell → products-shell` 결합이 해소되었거나 예외 범위가 문서화된 임시 baseline 이하로 줄었다.
4. `feature → datasource` 직접 참조와 `products/feature → products/ui` 역방향 의존이 신규 변경에서 재발하지 않는다.
5. `GetRankedProducts.ts`의 `boundaries/element-types` 우회 주석 제거 시나리오가 준비되었거나 실제 제거되었다.

### 운영 조건

- 신규 PR에서 같은 유형의 위반이 더 이상 추가되지 않는다.
- 대상 라이브러리 단위 lint 실행에서 warning 수준 기준이 안정적으로 유지된다.
- 팀이 “전체 저장소 일괄 전환”이 아니라 “문제 구역별 승격” 절차에 합의한다.

### 최종 전환 기준

다음 두 조건을 동시에 만족할 때만 루트/공통 설정을 실제 error enforcement로 맞춘다.

1. products 허브 관련 핵심 위반이 baseline 대비 의미 있게 감소했다.
2. 점진 활성화 대상 라이브러리에서 false positive 없이 lint가 반복적으로 통과한다.

이 기준 전에는 warning, 범위 제한, baseline 관리가 기본 전략이다.
