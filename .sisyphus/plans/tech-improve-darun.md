# Darun Tech Improve 진단 리포트 계획

## TL;DR

> **Quick Summary**: darun 모노레포의 기술 건강도를 6축(Architecture, Code Quality, Tests, Performance, Security, DX)으로 진단하고, 코드 근거 기반 우선순위를 정리한 리포트를 `.sisyphus/tech-improve/darun-20260421.md`에 저장한다.
>
> **Deliverables**:
> - 기술 건강도 진단 리포트 1개 (`.sisyphus/tech-improve/darun-20260421.md`)
> - 6축별 근거 목록, 심각도(P0-P3), 우선순위, 후속 권고
> - 리포트 저장 직후 실행 플랜 수립 여부를 묻는 단일 질문
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2-7 → Task 8 → Task 9 → Task 10 → F1-F4 → Task 11

---

## Context

### Original Request
사용자는 `/tech-improve` 워크플로우를 실행했다. 목표는 코드베이스의 기술 건강도를 6축으로 진단하고, 코드 근거 기반 우선순위를 정리한 뒤, 결과를 `.sisyphus/tech-improve/{repo-slug}-{YYYYMMDD}.md` 리포트로 저장하는 것이다. `.impeccable.md`의 `tech_contract`는 사용자 승인 없이 확정 작성하면 안 되며, 리포트 저장 후 최종적으로 1회만 실행 플랜 수립 여부를 확인해야 한다.

### Interview Summary
**Key Discussions**:
- 산출물은 우선 **진단 리포트**를 만들되, 이후 실행 플랜으로 자연스럽게 이어질 수 있게 설계한다.
- 진단 범위는 특정 도메인에 국한하지 않고 **전체 모노레포(`apps/*`, `libs/*`)**를 대상으로 한다.
- 브랜치 전략은 **브랜치에서 작업 후 main에 squash merge**이다.

**Research Findings**:
- 루트 스택은 `pnpm workspace + Turborepo`, `Node >= 22`, `TypeScript 5.9`, `React 19`, `Next.js 15`, `Vitest 4`, `Playwright`, `ESLint 9`, `Prettier 3`, `lefthook`이다.
- 구조는 `apps/*` 4개와 다수의 도메인 라이브러리로 구성된 모노레포이며, 라이브러리는 대체로 `domain → datasource → feature → shell/ui` 계층을 따른다.
- 리스크 후보로 빈 `service` 계층, 미완성 `feature`, 혼합 datasource, feature 내부 server/client 공존, 도메인 간 직접 의존이 탐지되었다.
- 루트 README에는 기본 검증 명령 `pnpm lint`, `pnpm typecheck`, `pnpm test`가 문서화되어 있다.
- repo 내부 `.impeccable.md`, `AGENTS.md`, `CONTRIBUTING`은 현재 근거상 확인되지 않았고, repo 내부 `tech_contract`도 보이지 않는다.

### Metis Review
**Identified Gaps** (addressed in this plan):
- 진단 기준 출처가 모호하므로, 리포트에 **판단 기준 출처** 섹션을 포함한다.
- 리포트에 민감 정보가 노출될 수 있으므로, **secret 값은 절대 기록하지 않고 유형/경로만 기록**한다.
- 전체 모노레포 진단은 범위가 넓으므로, **축별 샘플링 및 대표 파일 우선 조사 규칙**을 둔다.
- 베이스라인 상태가 불안정할 수 있으므로, **첫 작업을 베이스라인 검증**으로 둔다.
- 동일 날짜 리포트 충돌 가능성을 고려해, 파일 존재 여부를 먼저 확인하고 충돌 시 `-HHMM` suffix 전략을 사용한다.

### Oracle Review
**Verdict**: CONDITIONAL

**Reasons**:
- 현재 구조 리스크 후보 일부가 샘플링 기반 가설이므로, 전체 모노레포 결론으로 일반화할 때 확인된 패턴과 추정 패턴을 분리해야 한다.
- `apps/*`와 비우선 `libs/*`까지 포함한 최종 리포트에서는 샘플 외 추가 재확인 근거가 있어야만 모노레포 전반 결론으로 승격할 수 있다.
- 아키텍처 판단은 실제 import/export 구조, 파일 배치, 계층 증거를 기준으로만 리스크화해야 하며, P0는 보안/데이터 손실에만 한정해야 한다.

**Conditions Applied To This Plan**:
- 아키텍처 관련 발견은 모두 `확인됨` / `가설`로 구분해 기록한다.
- 모노레포 전체 수준 결론은 우선 샘플 외 최소 1개 추가 앱 또는 패키지에서 같은 패턴이 재확인될 때만 허용한다.
- `빈 service 계층`, `direct dependency`, `dual export`, `server/client 공존`은 실제 import/export 또는 파일 구조 증거가 있을 때만 리스크로 승격한다.

---

## Work Objectives

### Core Objective
실행자가 darun 모노레포의 기술 건강도를 6축으로 객관적으로 진단하고, 코드 근거와 심각도 분류를 포함한 단일 리포트를 저장할 수 있도록 작업 순서, 검증 기준, 범위 가드레일을 제공한다.

### Concrete Deliverables
- `.sisyphus/tech-improve/darun-20260421.md` 또는 동일 날짜 중복 시 `.sisyphus/tech-improve/darun-20260421-HHMM.md`
- 6축별 섹션: Architecture, Code Quality, Tests, Performance, Security, DX
- 각 발견별 근거 파일 경로, 심각도(P0-P3), 우선순위, 권고 액션
- `tech_contract` 관련 권고 섹션(확정 작성 금지)
- 리포트 저장 후 실행 플랜 수립 여부를 묻는 단일 질문

### Definition of Done
- [ ] 리포트 파일이 `.sisyphus/tech-improve/` 아래에 저장된다.
- [ ] 리포트에 6축 섹션이 모두 존재한다.
- [ ] 각 축에 최소 1개 이상의 코드 근거 또는 “진단 불가/N/A” 근거가 포함된다.
- [ ] 민감 정보 실제 값은 포함되지 않는다.
- [ ] 리포트 저장 후 사용자에게 실행 플랜 수립 여부를 정확히 1회 질문한다.

### Must Have
- 베이스라인 검증 결과(`pnpm lint`, `pnpm typecheck`, `pnpm test`, 필요 시 `pnpm build`)를 리포트에 반영
- 판단 기준 출처 명시(코드베이스 패턴 vs 업계 표준)
- 6축별 P0-P3 심각도 분류
- 전체 모노레포 범위를 다루되 샘플링 근거를 기록
- 브랜치 생성부터 main squash merge까지 포함한 종료 태스크

### Must NOT Have (Guardrails)
- `.impeccable.md` 생성/수정 금지
- `tech_contract` 확정 작성 금지
- Quick Win 코드 수정 금지
- 리포트 저장 전 사용자 확인 질문 금지
- secret/token/password 실제 값 리포트 기재 금지
- 단순 패턴을 과장된 심각도로 분류 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - 모든 검증은 에이전트가 실행한다.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (진단 결과 검증 중심)
- **Framework**: pnpm + Vitest + Playwright + ESLint
- **Note**: 이 계획은 코드를 구현하지 않고 진단 리포트를 생성하는 계획이므로, 테스트 추가보다 베이스라인 검증과 리포트 완결성 검증이 핵심이다.

### QA Policy
- 베이스라인 명령은 실제 실행하여 성공/실패를 증거로 남긴다.
- 각 축 진단은 최소 1개 happy-path(정상 탐색)와 1개 edge/failure-path(진단 불가/N/A/과다 결과 처리) 시나리오를 포함한다.
- 모든 증거는 `.sisyphus/evidence/` 아래 저장한다.
- 보안 진단 증거는 비밀값 마스킹 또는 개수/패턴 수준으로만 보존한다.

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Start Immediately - baseline + 6-axis probes):
├── Task 1: 작업 브랜치 생성 및 리포트 경로 충돌 점검 [quick]
├── Task 2: 베이스라인 검증(lint/typecheck/test/build) [unspecified-high]
├── Task 3: Architecture 축 진단 [deep]
├── Task 4: Code Quality 축 진단 [unspecified-high]
├── Task 5: Tests 축 진단 [unspecified-high]
├── Task 6: Performance 축 진단 [deep]
└── Task 7: Security + DX 축 진단 [deep]

Wave 2 (After Wave 1 - synthesis):
├── Task 8: 6축 결과 합성 및 심각도/Priority 정규화 [deep]
└── Task 9: 리포트 마크다운 작성 및 저장 [writing]

Wave 3 (After Wave 2 - closure):
├── Task 10: 저장 리포트 검증 + 단일 후속 질문 준비 [quick]
└── Task 11: main squash merge 및 브랜치 정리 [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review of report/process (unspecified-high)
├── Task F3: Real QA on commands/report file (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix

- **1**: - → 2-7, 10, 11
- **2**: 1 → 8, 9, 10
- **3**: 1 → 8, 9
- **4**: 1 → 8, 9
- **5**: 1 → 8, 9
- **6**: 1 → 8, 9
- **7**: 1 → 8, 9
- **8**: 2-7 → 9, 10
- **9**: 2-8 → 10, F1-F4
- **10**: 1, 2, 8, 9 → F1-F4, 11
- **11**: 1, 10, F1-F4 → 완료

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`, T2 → `unspecified-high`, T3 → `deep`, T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `deep`, T7 → `deep`
- **Wave 2**: T8 → `deep`, T9 → `writing`
- **Wave 3**: T10 → `quick`, T11 → `quick`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 작업 브랜치 생성 및 리포트 경로 충돌 점검

  **What to do**:
  - `git checkout -b tech-improve-darun`으로 작업 브랜치를 생성한다. 이미 존재하면 해당 브랜치로 체크아웃한다.
  - `.sisyphus/tech-improve/` 디렉토리 존재 여부를 확인하고, 없으면 생성 가능 여부만 확인한다.
  - 기본 리포트 경로 `.sisyphus/tech-improve/darun-20260421.md`의 충돌 여부를 확인하고, 충돌 시 `darun-20260421-HHMM.md` 규칙을 적용할 준비를 한다.

  **Must NOT do**:
  - main 브랜치에서 직접 작업 시작 금지
  - 리포트 본문을 이 단계에서 작성 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 브랜치/경로 준비와 충돌 점검 중심의 짧은 작업이다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: 현재 단계는 실행자가 기본 git 흐름으로 처리 가능한 단순 브랜치 준비이므로 필수 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 2, 3, 4, 5, 6, 7, 10, 11
  - **Blocked By**: None (can start immediately)

  **References**:
  - `README.md` - 프로젝트 루트와 기본 검증 명령 문맥을 확인하는 기준 문서다.
  - `.sisyphus/plans/tech-improve-darun.md:64-69` - 리포트 파일명 규칙과 필수 산출물 목록을 그대로 따라야 한다.
  - `.sisyphus/plans/tech-improve-darun.md:23-27` - 전체 모노레포 범위와 `브랜치 후 main squash merge` 결정이 요약된 인터뷰 결과다.

  **Acceptance Criteria**:
  - [ ] 작업 브랜치가 `tech-improve-darun`으로 준비된다.
  - [ ] 최종 리포트 파일 경로 후보가 1개로 결정된다.
  - [ ] 경로 충돌 시 `-HHMM` suffix 규칙이 적용 가능함이 확인된다.

  **QA Scenarios**:

  ```text
  Scenario: 새 브랜치와 기본 리포트 경로 준비
    Tool: Bash (git + ls)
    Preconditions: 저장소 루트 `/Users/owen/Projects/croco/darun`
    Steps:
      1. `git branch --show-current`로 현재 브랜치를 확인한다.
      2. `git checkout -b tech-improve-darun || git checkout tech-improve-darun`를 실행한다.
      3. `ls ".sisyphus"` 및 `ls ".sisyphus/tech-improve"`로 디렉토리 존재 여부를 확인한다.
      4. `test -f ".sisyphus/tech-improve/darun-20260421.md"`를 실행해 기본 경로 충돌 여부를 판단한다.
    Expected Result: 작업 브랜치가 준비되고, 리포트 저장 경로가 기본 이름 또는 `-HHMM` 규칙 중 하나로 결정된다.
    Failure Indicators: 브랜치 생성/체크아웃 실패, `.sisyphus` 하위 경로 접근 실패, 충돌 처리 규칙 미정
    Evidence: .sisyphus/evidence/task-1-branch-and-path.txt

  Scenario: 기존 동일 날짜 리포트가 이미 존재하는 경우
    Tool: Bash (test)
    Preconditions: `.sisyphus/tech-improve/darun-20260421.md`가 이미 존재하거나 존재한다고 가정 가능한 상태
    Steps:
      1. 기본 파일이 존재하면 현재 시간을 `date +%H%M`으로 구한다.
      2. 후보 경로를 `darun-20260421-HHMM.md` 형식으로 계산한다.
      3. 계산된 경로가 기존 파일과 구분되는지 확인한다.
    Expected Result: 덮어쓰기 없이 새 후보 경로가 정해진다.
    Failure Indicators: 동일 이름 유지, 덮어쓰기 전제, suffix 규칙 누락
    Evidence: .sisyphus/evidence/task-1-path-conflict.txt
  ```

- [x] 2. 베이스라인 검증 실행 및 실패 영역 기록

  **What to do**:
  - 루트 기준 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 실행한다.
  - 각 명령의 성공/실패, 실패 시 대표 에러 유형과 영향 범위를 기록한다.
  - 전체 진단의 신뢰도에 영향을 주는 베이스라인 불안정성을 리포트의 전제 조건으로 남긴다.

  **Must NOT do**:
  - 실패를 숨기거나 임의로 재해석 금지
  - 실패를 고치기 위한 코드 수정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 워크스페이스 전체 검증 명령을 실행하고 실패 원인을 구조적으로 분류해야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `audit`: 이번 작업은 전체 품질 감사가 아니라 베이스라인 실행 결과 수집에 초점이 있다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 3, 4, 5, 6, 7)
  - **Blocks**: 8, 9, 10
  - **Blocked By**: 1

  **References**:
  - `README.md` - 기본 검증 명령(`pnpm lint`, `pnpm typecheck`, `pnpm test`)의 문서 근거다.
  - `package.json` - 루트 스크립트와 Turborepo 워크스페이스 명령 정의를 확인해야 한다.
  - `turbo.json` - build/typecheck/test 파이프라인 연결 관계를 해석하는 기준이다.

  **Acceptance Criteria**:
  - [ ] 네 가지 명령의 실행 결과가 모두 기록된다.
  - [ ] 실패한 명령이 있다면 실패 요약과 영향 범위가 남는다.
  - [ ] 리포트에서 베이스라인 상태를 전제로 참조할 수 있다.

  **QA Scenarios**:

  ```text
  Scenario: 기본 검증 명령 실행 결과 수집
    Tool: Bash
    Preconditions: 의존성 설치가 완료된 저장소 루트
    Steps:
      1. `pnpm lint`를 실행하고 종료 코드와 핵심 출력 요약을 기록한다.
      2. `pnpm typecheck`를 실행하고 종료 코드와 핵심 출력 요약을 기록한다.
      3. `pnpm test`를 실행하고 종료 코드와 핵심 출력 요약을 기록한다.
      4. `pnpm build`를 실행하고 종료 코드와 핵심 출력 요약을 기록한다.
    Expected Result: 각 명령이 PASS/FAIL로 분류되어 증거 파일에 남는다.
    Failure Indicators: 실행 로그 누락, 종료 코드 미기록, 특정 명령 생략
    Evidence: .sisyphus/evidence/task-2-baseline.txt

  Scenario: 하나 이상의 명령이 실패하는 경우
    Tool: Bash
    Preconditions: 현재 저장소 상태에서 일부 명령 실패 가능
    Steps:
      1. 실패한 명령의 stderr/stdout 요약을 추출한다.
      2. 실패가 특정 앱/패키지/워크스페이스 전반 중 어디에 영향을 미치는지 분류한다.
      3. 리포트 초안에 "베이스라인 불안정" 또는 "진단 불가 영역"으로 기록할 수 있는 형태로 정리한다.
    Expected Result: 실패가 은폐되지 않고 진단 전제로 명시된다.
    Failure Indicators: 실패 사실 누락, 원인 미분류, 후속 진단 범위 왜곡
    Evidence: .sisyphus/evidence/task-2-baseline-failures.txt
  ```

- [x] 3. Architecture 축 진단

  **What to do**:
  - `apps/*`, `libs/*` 전반에서 모듈 경계, 계층 일관성, 직접 의존, 빈 계층, 순환 의존 가능성을 조사한다.
  - 전체 모노레포를 모두 동일 깊이로 읽지 말고, `accounts`, `products`, `shared/provider-*`를 우선 샘플로 삼고 다른 영역은 구조 스캔으로 보완한다.
  - Oracle 조건에 따라 아키텍처 발견을 `확인됨` / `가설`로 구분하고, 모노레포 전반 결론은 우선 샘플 외 최소 1개 추가 앱 또는 패키지에서 재확인된 경우에만 내린다.
  - 아키텍처 발견을 P0-P3가 아닌 "구조 리스크 + 근거 + 영향" 형식으로 먼저 정리한 뒤 Task 8에서 최종 심각도를 정규화한다.

  **Must NOT do**:
  - 단순 디렉토리 구조 차이를 과장해 중대 결함으로 규정 금지
  - 코드 수정 제안 수준을 넘는 리팩터링 착수 금지
  - 실제 import/export 구조나 파일 배치 증거 없이 구조 리스크로 단정 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 계층 구조와 도메인 경계 해석이 필요하고, 전체 모노레포 샘플링 판단도 함께 수행해야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `tech-improve`: 이미 상위 워크플로우 맥락을 수동으로 반영했으므로 중복 사용하지 않음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 4, 5, 6, 7)
  - **Blocks**: 8, 9
  - **Blocked By**: 1

  **References**:
  - `pnpm-workspace.yaml` - 앱/라이브러리 전반의 워크스페이스 경계를 보여준다.
  - `.sisyphus/plans/tech-improve-darun.md:44-58` - Oracle CONDITIONAL 판정과 적용 조건의 원문 근거다.
  - `libs/products/feature/package.json` - feature 패키지의 client/server dual export 패턴 근거다.
  - `libs/products/feature/src/server.ts` - feature 내부 server 책임 위치를 보여준다.
  - `libs/accounts/feature/src/index.ts` - 미완성 feature 패키지의 대표 사례다.
  - `libs/accounts/service/src/index.ts` - 빈 service 계층 문제의 대표 근거다.

  **Acceptance Criteria**:
  - [ ] 최소 3개 구조 리스크 또는 정상 패턴이 파일 경로와 함께 기록된다.
  - [ ] 샘플링 근거(왜 해당 영역을 깊게 봤는지)가 남는다.
  - [ ] 순환 의존/직접 의존/빈 계층 여부가 명시된다.
  - [ ] 각 발견이 `확인됨` 또는 `가설`로 구분된다.
  - [ ] 모노레포 전체 결론은 우선 샘플 외 추가 재확인 근거를 동반한다.

  **QA Scenarios**:

  ```text
  Scenario: 우선 샘플 영역의 구조 리스크 수집
    Tool: Read + Grep + LSP/검색 도구
    Preconditions: 워크스페이스 파일 읽기 가능
    Steps:
      1. `libs/accounts/*`, `libs/products/*`, `libs/shared/provider-*`의 package/index/server 진입 파일을 조사한다.
      2. 빈 export, 직접 의존, dual export, 계층 누락 여부를 파일 경로와 함께 정리한다.
      3. 다른 도메인 1-2곳을 얕게 스캔해 샘플이 전체 경향과 얼마나 맞는지 확인한다.
    Expected Result: 구조상 핵심 리스크와 정상 패턴이 모두 근거와 함께 정리된다.
    Failure Indicators: 샘플링 이유 부재, 파일 경로 없는 주장, 특정 도메인만 보고 전체 결론 도출
    Evidence: .sisyphus/evidence/task-3-architecture.txt

  Scenario: 빌드 불가/비어 있는 계층 때문에 진단이 불완전한 경우
    Tool: Read + Grep
    Preconditions: 일부 패키지가 비어 있거나 미완성 상태
    Steps:
      1. `export {}` 또는 빈 엔트리 파일을 식별한다.
      2. 해당 패키지가 의도적 placeholder인지, 미완성 리스크인지 분류한다.
      3. 판단이 어려우면 "진단 불가/추정"으로 낮은 확신 수준을 명시한다.
    Expected Result: 불확실성이 숨겨지지 않고 명시된다.
    Failure Indicators: 빈 패키지를 단정적으로 결함 처리, 불확실성 미표기
    Evidence: .sisyphus/evidence/task-3-architecture-edge.txt
  ```

- [x] 4. Code Quality 축 진단

  **What to do**:
  - lint/typecheck 결과와 실제 코드 샘플을 결합해 코드 스멜, 타입 안전성 이탈, 경계 규칙 위반 신호를 수집한다.
  - 루트 ESLint/TS 설정과 대표 패키지 코드 샘플을 비교해 설정과 실제 코드의 간극을 식별한다.
  - 과도한 일반화 없이 "설정상 기대"와 "실제 코드 패턴"을 분리해 기록한다.

  **Must NOT do**:
  - lint 규칙 존재만으로 실제 위반이 있다고 가정 금지
  - 주관적 스타일 선호를 P1 이상으로 과대평가 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 설정 파일, lint 결과, 대표 코드 샘플을 함께 읽고 종합해야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `audit`: 접근성/성능 중심 감사보다 코드 품질 근거 수집이 핵심이다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3, 5, 6, 7)
  - **Blocks**: 8, 9
  - **Blocked By**: 1

  **References**:
  - `eslint.config.mjs` - boundaries, react-compiler 등 품질 규칙의 기준점이다.
  - `tsconfig.json` - 루트 타입체크 기준과 공통 설정 진입점이다.
  - `libs/shared/utils-tsconfig/tsconfig.base.json` - 실제 strict 옵션과 컴파일러 기준의 근거다.
  - `README.md` - typecheck/lint가 공식 검증 흐름임을 보여준다.

  **Acceptance Criteria**:
  - [ ] 코드 품질 발견 사항이 설정 근거 + 코드 근거로 연결된다.
  - [ ] 타입 안정성/경계 규칙/코드 스멜 중 최소 2개 영역이 평가된다.
  - [ ] 주관적 선호와 객관적 위반이 분리 기록된다.

  **QA Scenarios**:

  ```text
  Scenario: 설정과 실제 코드 품질 간극 파악
    Tool: Read + Bash
    Preconditions: ESLint/TypeScript 설정 파일 접근 가능, Task 2 결과 존재
    Steps:
      1. `eslint.config.mjs`, `tsconfig.json`, `libs/shared/utils-tsconfig/tsconfig.base.json`을 읽는다.
      2. Task 2의 lint/typecheck 결과와 연결되는 대표 파일 3-5개를 고른다.
      3. 규칙 위반/타입 안전성 문제/경계 위반 신호를 파일 경로와 함께 기록한다.
    Expected Result: 품질 평가가 설정 기반 근거와 실제 코드 근거를 함께 가진다.
    Failure Indicators: 설정만 보고 결론 도출, 코드 샘플 없는 품질 판정
    Evidence: .sisyphus/evidence/task-4-code-quality.txt

  Scenario: lint/typecheck가 모두 통과해도 잠재 리스크가 있는 경우
    Tool: Read
    Preconditions: 검증 명령이 PASS일 수 있음
    Steps:
      1. PASS 상태에서도 빈 계층, 과도한 결합, export 구조 불균형 등 정적 품질 리스크를 따로 분리한다.
      2. 이를 "현재 규칙으로는 포착되지 않는 리스크"로 태깅한다.
    Expected Result: 도구 통과와 품질 우수 판정을 혼동하지 않는다.
    Failure Indicators: PASS=문제 없음으로 단정
    Evidence: .sisyphus/evidence/task-4-code-quality-edge.txt
  ```

- [x] 5. Tests 축 진단

  **What to do**:
  - Vitest/Playwright 존재 여부를 넘어서 실제 테스트 분포, 커버리지 공백, 테스트 불가능 영역을 조사한다.
  - 테스트가 없는 패키지는 0%로 단정하지 말고 N/A 또는 미구성으로 분리한다.
  - 앱/라이브러리별 대표 테스트 패턴과 누락 패턴을 정리한다.

  **Must NOT do**:
  - 테스트 파일 수만으로 품질을 단정 금지
  - coverage 수치가 없는데 임의 추정 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 설정, 스크립트, 실제 테스트 파일 분포를 함께 봐야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `dogfood`: 실제 제품 QA보다 테스트 자산 구조 진단이 목적이다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3, 4, 6, 7)
  - **Blocks**: 8, 9
  - **Blocked By**: 1

  **References**:
  - `vitest.config.ts` - 루트 테스트 프레임워크와 커버리지 구성을 확인하는 기준이다.
  - `README.md` - `pnpm test`가 공식 검증 명령임을 보여준다.
  - `apps/service-web` 관련 Playwright 설정/테스트 파일 - E2E 테스트 존재와 범위를 파악하는 핵심 근거다.
  - `package.json` - 워크스페이스 테스트 스크립트 연결을 확인해야 한다.

  **Acceptance Criteria**:
  - [ ] 단위/E2E/미구성 영역이 구분 기록된다.
  - [ ] 대표 테스트 파일 또는 테스트 부재 근거가 파일 경로와 함께 남는다.
  - [ ] 테스트 축의 N/A 기준이 명시된다.

  **QA Scenarios**:

  ```text
  Scenario: 테스트 자산 분포와 실행 경로 확인
    Tool: Read + Glob + Bash
    Preconditions: 테스트 설정 파일 접근 가능
    Steps:
      1. `vitest.config.ts`와 관련 package 스크립트를 읽는다.
      2. 단위 테스트 파일과 Playwright E2E 파일을 각각 찾는다.
      3. 어떤 앱/라이브러리가 테스트 대상이며 어떤 영역이 비어 있는지 표로 정리한다.
    Expected Result: 테스트 존재/부재/미구성 상태가 분리된 근거와 함께 정리된다.
    Failure Indicators: 테스트 프레임워크 존재만 기록하고 실제 분포 미조사
    Evidence: .sisyphus/evidence/task-5-tests.txt

  Scenario: 테스트가 전혀 없거나 실행 불가한 패키지 발견
    Tool: Read + Bash
    Preconditions: 일부 패키지에 테스트가 없을 수 있음
    Steps:
      1. 대표 패키지에서 테스트 파일 부재 여부를 확인한다.
      2. Task 2의 test 결과와 연결해 실행 불가인지, 단순 미구성인지 분리한다.
      3. 리포트에는 `0%` 대신 `N/A` 또는 `미구성`으로 기록한다.
    Expected Result: 테스트 부재가 정확한 용어로 기록된다.
    Failure Indicators: 근거 없는 수치화, 미구성과 실패를 혼동
    Evidence: .sisyphus/evidence/task-5-tests-edge.txt
  ```

- [x] 6. Performance 축 진단

  **What to do**:
  - 실제 벤치마크 대신 코드/구조 기반 성능 리스크를 찾는다.
  - Next.js 앱의 번들 경계, GraphQL/API 레이어의 N+1 가능성, 데이터 접근 패턴, 불필요한 클라이언트/서버 결합을 우선 본다.
  - "성능 문제 확정"이 아니라 "성능 리스크 가설 + 근거" 형태로 기록한다.

  **Must NOT do**:
  - 실제 프로파일링 없이 수치 성능 결론 단정 금지
  - 체감 추정만으로 P0/P1 부여 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 데이터 흐름과 계층 구조를 함께 읽어야 성능 리스크를 해석할 수 있다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `optimize`: 실제 최적화 구현이 아니라 진단/가설 도출이 목표다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3, 4, 5, 7)
  - **Blocks**: 8, 9
  - **Blocked By**: 1

  **References**:
  - `apps/service-web/package.json` - 프론트엔드 앱 성능 분석 대상의 의존성과 실행 컨텍스트다.
  - `apps/graphql-api/package.json` - API 성능 병목 후보(서버/GraphQL) 맥락을 제공한다.
  - `libs/products/feature/src/server.ts` - resolver 레이어에서 데이터 접근 패턴을 살필 수 있는 예시다.
  - `libs/products/datasource/src/index.ts` - 저장소 구현 경계와 데이터 호출 구조의 근거다.

  **Acceptance Criteria**:
  - [ ] 최소 2개 이상의 성능 리스크 가설이 파일 경로와 함께 기록된다.
  - [ ] 가설과 확정 이슈가 구분된다.
  - [ ] 실제 측정 부재 시 그 한계가 리포트에 명시된다.

  **QA Scenarios**:

  ```text
  Scenario: 구조 기반 성능 리스크 가설 수집
    Tool: Read + Grep
    Preconditions: 앱/feature/datasource 파일 접근 가능
    Steps:
      1. Next.js 앱과 GraphQL resolver/datasource 진입 파일을 읽는다.
      2. 다중 데이터 호출, 중복 fetch 가능성, client/server 경계 혼재 여부를 찾는다.
      3. 각 발견을 "가설"로 태깅하고 근거 파일을 함께 남긴다.
    Expected Result: 성능 리스크가 단정적 결론이 아닌 근거 기반 가설로 정리된다.
    Failure Indicators: 수치 없는 성능 확정 판정, 근거 파일 누락
    Evidence: .sisyphus/evidence/task-6-performance.txt

  Scenario: 측정할 수 없는 경우 한계 명시
    Tool: Read
    Preconditions: 프로파일러/번들 리포트 부재 가능
    Steps:
      1. 실제 번들 크기/응답 시간 수치가 없음을 확인한다.
      2. 리포트에 "정적 분석 기준"과 "미측정 한계"를 함께 기록한다.
    Expected Result: 성능 섹션이 과장 없이 제한점을 드러낸다.
    Failure Indicators: 측정 부재 은폐, 정적 추정을 실측처럼 기술
    Evidence: .sisyphus/evidence/task-6-performance-edge.txt
  ```

- [x] 7. Security 및 DX 축 진단

  **What to do**:
  - Security: 하드코딩 secret 패턴, 인증/권한 경계, 의존성 취약점 점검 가능 여부를 조사하되 실제 secret 값은 기록하지 않는다.
  - DX: 개발자 경험 관점에서 설치/검증/훅/스크립트/문서 일관성을 조사한다.
  - 두 축을 함께 다루되, 결과는 리포트에서 Security와 DX를 별도 하위 섹션으로 분리한다.

  **Must NOT do**:
  - secret/token/password의 실제 값을 리포트나 증거에 남기지 말 것
  - 동적 침투 테스트나 외부 시스템 공격 시도 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 보안 위생과 개발자 경험은 설정/코드/문서/워크플로우를 함께 읽어야 판단 가능하다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `harden`: 실제 보강 구현이 아니라 진단이 목적이다.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with 2, 3, 4, 5, 6)
  - **Blocks**: 8, 9
  - **Blocked By**: 1

  **References**:
  - `README.md` - 설치/개발/검증 명령의 DX 기준점이다.
  - `package.json` - 루트 스크립트와 워크스페이스 진입점 일관성을 보는 기준이다.
  - `eslint.config.mjs` / `vitest.config.ts` / `turbo.json` - 개발 워크플로우와 자동화 수준 판단 근거다.
  - `libs/shared/provider-auth/*` - 인증/권한 경계와 보안 위생을 샘플링할 핵심 영역이다.

  **Acceptance Criteria**:
  - [ ] Security와 DX가 별도 근거 세트로 정리된다.
  - [ ] 민감 정보는 마스킹 원칙이 지켜진다.
  - [ ] 설치/검증/훅/문서/인증 경계 중 최소 3개 관점이 평가된다.

  **QA Scenarios**:

  ```text
  Scenario: 보안 위생과 DX 흐름 점검
    Tool: Read + Grep + Bash
    Preconditions: 루트 설정/문서와 auth/provider 관련 파일 접근 가능
    Steps:
      1. 루트 문서와 스크립트에서 설치/개발/검증 흐름을 정리한다.
      2. 인증 관련 shared/provider 샘플을 읽어 권한 경계와 secret 취급 방식을 확인한다.
      3. 하드코딩 secret 패턴 검색 시 값은 기록하지 않고 파일 경로와 패턴 종류만 남긴다.
    Expected Result: Security와 DX 각각의 발견 사항이 마스킹 원칙을 지키며 정리된다.
    Failure Indicators: secret 원문 기록, DX와 Security 근거 혼재, 스크립트/문서 불일치 미기록
    Evidence: .sisyphus/evidence/task-7-security-dx.txt

  Scenario: 취약점 후보가 과도하게 많이 발견되는 경우
    Tool: Grep + Read
    Preconditions: 패턴 검색 결과가 많을 수 있음
    Steps:
      1. 동일 유형 결과를 그룹화한다.
      2. 상위 대표 사례 10개 이하만 상세 기록하고 나머지는 개수/범주로 요약한다.
      3. 실제 비밀값은 전부 마스킹한다.
    Expected Result: 결과 과밀 없이 대표 사례 중심으로 보고된다.
    Failure Indicators: 민감값 노출, 결과 폭주 그대로 나열, 유형 분류 누락
    Evidence: .sisyphus/evidence/task-7-security-dx-edge.txt
  ```

- [x] 8. 6축 결과 합성 및 심각도/Priority 정규화

  **What to do**:
  - Tasks 2-7의 발견을 한데 모아 중복을 제거하고, P0-P3 심각도와 우선순위를 일관되게 재분류한다.
  - P0는 보안/데이터 손실 급만 허용하고, 나머지는 근거와 영향에 따라 P1-P3로 낮춘다.
  - Task 3의 아키텍처 발견은 Oracle 조건을 이어받아 `확인됨` / `가설` 표시를 유지하고, 근거가 약한 항목은 보수적으로 낮은 심각도 또는 추가 확인 필요로 분류한다.
  - 판단 기준 출처(코드베이스 패턴 vs 업계 표준)를 명시하고 각 발견에 어떤 기준이 적용됐는지 연결한다.

  **Must NOT do**:
  - 축별 발견을 그대로 나열만 하고 교차 중복 제거 생략 금지
  - 심각도 기준 없이 직감으로 우선순위 부여 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 다축 결과를 합성하고 일관된 우선순위 체계로 정규화해야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `writing`: 아직 문서화보다 분석/분류가 우선이다.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: 9, 10
  - **Blocked By**: 2, 3, 4, 5, 6, 7

  **References**:
  - `.sisyphus/plans/tech-improve-darun.md:78-91` - Must Have와 Guardrails가 심각도 정규화 기준이다.
  - `.sisyphus/plans/tech-improve-darun.md:44-55` - Oracle 판정의 구조 판단 조건과 P0 제한 근거다.
  - `.sisyphus/plans/tech-improve-darun.md:36-42` - Metis Review가 판단 기준 출처, 샘플링, 민감 정보, P0 제한 관련 보완 근거다.
  - Tasks 2-7 evidence files - 축별 원본 발견을 교차 검증할 출처다.

  **Acceptance Criteria**:
  - [ ] 모든 발견이 P0-P3 또는 N/A로 정규화된다.
  - [ ] 판단 기준 출처가 명시된다.
  - [ ] 중복 발견이 통합된다.
  - [ ] 아키텍처 관련 항목의 `확인됨` / `가설` 상태가 보존된다.
  - [ ] 근거가 약한 구조 항목은 높은 심각도로 과대분류되지 않는다.

  **QA Scenarios**:

  ```text
  Scenario: 다축 발견 통합과 심각도 정규화
    Tool: Read
    Preconditions: Tasks 2-7 증거 파일 존재
    Steps:
      1. 각 태스크 결과를 한 표로 모은다.
      2. 동일 원인/동일 파일에서 나온 중복 발견을 병합한다.
      3. P0-P3 기준을 적용하고, 각 판단 옆에 기준 출처를 남긴다.
    Expected Result: 리포트 작성 직전의 단일 정규화 목록이 완성된다.
    Failure Indicators: 중복 미통합, P0 남용, 기준 출처 누락
    Evidence: .sisyphus/evidence/task-8-normalized-findings.txt

  Scenario: 심각도 판단이 애매한 발견 존재
    Tool: Read
    Preconditions: 일부 발견의 영향도가 불명확할 수 있음
    Steps:
      1. 불확실한 발견을 "추가 확인 필요" 또는 낮은 심각도 후보로 분리한다.
      2. 근거 부족 상태를 그대로 리포트 메모에 남긴다.
    Expected Result: 불확실성을 숨기지 않고 보수적으로 분류한다.
    Failure Indicators: 근거 부족 발견을 높은 심각도로 단정
    Evidence: .sisyphus/evidence/task-8-normalized-findings-edge.txt
  ```

- [x] 9. 진단 리포트 마크다운 작성 및 저장

  **What to do**:
  - 정규화된 결과를 바탕으로 `.sisyphus/tech-improve/{resolved-filename}.md` 리포트를 작성한다.
  - 리포트에는 TL;DR, 판단 기준 출처, 베이스라인 결과, 6축 섹션, 우선순위 목록, `tech_contract` 권고, 진단 불가/N/A 영역을 포함한다.
  - 아키텍처 섹션에는 Oracle 조건을 반영해 `확인됨` / `가설`을 명시하고, 전체 모노레포 결론에는 추가 재확인 근거를 함께 적는다.
  - 리포트 저장 시 민감 정보 마스킹과 파일명 충돌 규칙을 재확인한다.

  **Must NOT do**:
  - `.impeccable.md` 생성/수정 금지
  - 실행 플랜을 이 단계에서 추가 생성 금지

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 다량의 구조화된 분석 결과를 일관된 리포트 형식으로 정리해야 한다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `clarify`: UX 문구 개선보다 기술 리포트 구조화가 핵심이다.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: 10, F1-F4
  - **Blocked By**: 2, 3, 4, 5, 6, 7, 8

  **References**:
  - `.sisyphus/plans/tech-improve-darun.md:64-69` - 리포트가 반드시 포함해야 할 deliverables 목록이다.
  - `.sisyphus/plans/tech-improve-darun.md:71-91` - Definition of Done, Must Have, Must NOT Have를 만족해야 한다.
  - `.sisyphus/plans/tech-improve-darun.md:44-55` - Oracle 조건상 아키텍처 판단 표기 규칙을 따라야 한다.
  - `.sisyphus/evidence/task-8-normalized-findings.txt` - 리포트 본문에 반영할 정규화 결과의 원본이다.

  **Acceptance Criteria**:
  - [ ] 리포트 파일이 `.sisyphus/tech-improve/` 아래에 저장된다.
  - [ ] 6축 섹션과 판단 기준 출처 섹션이 모두 존재한다.
  - [ ] `tech_contract`는 권고로만 서술되고 확정 작성되지 않는다.
  - [ ] 아키텍처 발견은 `확인됨` / `가설` 표기를 포함한다.
  - [ ] 모노레포 전반 결론은 추가 재확인 근거 없이 단정되지 않는다.

  **QA Scenarios**:

  ```text
  Scenario: 리포트 파일 저장 및 필수 섹션 검증
    Tool: Read + Bash
    Preconditions: Task 8 완료, 최종 파일명 결정 완료
    Steps:
      1. `.sisyphus/tech-improve/{resolved-filename}.md`를 저장한다.
      2. `grep` 또는 동등한 검색으로 `## Architecture`, `## Code Quality`, `## Tests`, `## Performance`, `## Security`, `## DX` 섹션 존재를 확인한다.
      3. `판단 기준 출처`, `tech_contract 권고`, `베이스라인 결과` 섹션 존재도 확인한다.
    Expected Result: 단일 리포트 파일이 요구 섹션을 모두 포함한 채 저장된다.
    Failure Indicators: 파일 미저장, 6축 섹션 누락, 금지 섹션 누락 또는 확정 tech_contract 작성
    Evidence: .sisyphus/evidence/task-9-report-saved.txt

  Scenario: 민감 정보 노출 또는 파일명 충돌 발생
    Tool: Read + Bash
    Preconditions: 보안 관련 발견이 포함되어 있거나 기존 날짜 파일 존재 가능
    Steps:
      1. 리포트 내 `secret`, `token`, `password` 관련 줄을 검토해 실제 값 노출이 없는지 확인한다.
      2. 파일명이 기본 규칙 또는 `-HHMM` 규칙을 따르는지 확인한다.
    Expected Result: 민감값이 없고 파일명 충돌 없이 저장된다.
    Failure Indicators: secret 원문 존재, 덮어쓰기, 비규칙 파일명
    Evidence: .sisyphus/evidence/task-9-report-saved-edge.txt
  ```

- [x] 10. 저장 리포트 검증 및 단일 후속 질문 준비

  **What to do**:
  - 저장된 리포트를 다시 읽어 계획 대비 누락이 없는지 검증한다.
  - 후속 사용자 질문은 "이 리포트를 바탕으로 실행 플랜까지 수립할까요?" 1회만 준비한다.
  - 이 질문 전에는 추가 문서/플랜/.impeccable 관련 파일을 만들지 않는다.

  **Must NOT do**:
  - 질문을 두 번 이상 만들거나 사전 질문 추가 금지
  - 리포트 저장 후 임의 Quick Win 작업으로 범위 확장 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 저장 결과 재검증과 단일 후속 질문 정리가 중심이다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `review-work`: 최종 병렬 검증 웨이브가 별도로 정의되어 있다.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3)
  - **Blocks**: 11, F1-F4
  - **Blocked By**: 1, 2, 8, 9

  **References**:
  - `.sisyphus/plans/tech-improve-darun.md:58-78` - 완료 정의와 가드레일 재검증 기준이다.
  - `.sisyphus/tech-improve/{resolved-filename}.md` - 최종 산출물 자체를 직접 검토해야 한다.

  **Acceptance Criteria**:
  - [ ] 후속 질문 문안이 정확히 1개로 확정된다.
  - [ ] 리포트 누락 항목이 있으면 FINAL 웨이브 전 보완 대상으로 드러난다.
  - [ ] 추가 파일 생성 없이 종료 준비가 완료된다.

  **QA Scenarios**:

  ```text
  Scenario: 저장 리포트 재검증
    Tool: Read
    Preconditions: Task 9 완료
    Steps:
      1. 저장된 리포트를 처음부터 끝까지 다시 읽는다.
      2. 6축, 판단 기준 출처, 베이스라인 결과, 우선순위, tech_contract 권고, N/A/진단 불가 표기가 모두 있는지 체크리스트로 검증한다.
    Expected Result: 최종 확인 체크리스트가 채워진다.
    Failure Indicators: 필수 섹션 누락, 질문 횟수 규칙 누락, 저장된 내용과 계획 불일치
    Evidence: .sisyphus/evidence/task-10-report-verification.txt

  Scenario: 후속 질문이 중복되려는 경우
    Tool: Read
    Preconditions: 리포트 완료 후 사용자 커뮤니케이션 준비 단계
    Steps:
      1. 사용자에게 던질 문장을 하나만 작성한다.
      2. 이전 단계 문서나 메모에 다른 질문 후보가 없는지 점검한다.
    Expected Result: "실행 플랜까지 수립할까요?" 성격의 질문이 정확히 1회만 준비된다.
    Failure Indicators: 복수 질문 준비, 리포트 저장 전 질문 흔적, 범위 확장 질문 포함
    Evidence: .sisyphus/evidence/task-10-followup-question.txt
  ```

- [ ] 11. main에 squash merge 및 브랜치 정리

  **What to do**:
  - FINAL 검증 웨이브가 모두 승인된 뒤 `main`으로 체크아웃한다.
  - `git merge --squash tech-improve-darun` 후 단일 커밋으로 반영한다.
  - 머지 완료 후 작업 브랜치를 삭제한다.

  **Must NOT do**:
  - FINAL 검증 전 merge 금지
  - 일반 merge/rebase로 히스토리 확장 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 사용자 선택 브랜치 전략에 따른 마무리 git 작업이다.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: git 작업이지만 이미 계획에 정확한 명령 순서가 명시되므로 필수 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 3 final step)
  - **Blocks**: 완료
  - **Blocked By**: 1, 10, F1, F2, F3, F4

  **References**:
  - `.sisyphus/plans/tech-improve-darun.md:23-27` - 사용자가 선택한 브랜치 전략의 계획 내 근거다.
  - `.sisyphus/plans/tech-improve-darun.md:83-83` - 브랜치 생성부터 main squash merge까지 포함해야 한다는 Must Have다.
  - `.sisyphus/plans/tech-improve-darun.md:864-868` - 최종 커밋 메시지와 pre-commit 기준이다.

  **Acceptance Criteria**:
  - [ ] `main`에 squash merge가 수행된다.
  - [ ] 최종 커밋 메시지가 기록된다.
  - [ ] `tech-improve-darun` 브랜치가 정리된다.

  **QA Scenarios**:

  ```text
  Scenario: 검증 완료 후 main squash merge
    Tool: Bash (git)
    Preconditions: F1-F4 모두 APPROVE, 작업 브랜치 `tech-improve-darun` 존재
    Steps:
      1. `git checkout main`을 실행한다.
      2. `git merge --squash tech-improve-darun`을 실행한다.
      3. `git commit -m "docs(tech-improve): add darun technical health report"`를 실행한다.
      4. `git branch -D tech-improve-darun`을 실행한다.
    Expected Result: main에 단일 squash 커밋이 반영되고 작업 브랜치가 삭제된다.
    Failure Indicators: squash 미사용, 검증 전 merge, 브랜치 미삭제
    Evidence: .sisyphus/evidence/task-11-squash-merge.txt

  Scenario: FINAL 검증 중 하나라도 거절된 경우
    Tool: Read + Bash (git status)
    Preconditions: F1-F4 중 APPROVE가 아닌 결과 존재
    Steps:
      1. FINAL 결과를 확인한다.
      2. `git status`로 현재 브랜치 상태만 확인하고 merge를 보류한다.
      3. 거절 이슈를 해결하기 전까지 main 전환/merge를 수행하지 않는다.
    Expected Result: 검증 실패 시 merge가 차단된다.
    Failure Indicators: REJECT 상태인데 merge 진행, 차단 조건 누락
    Evidence: .sisyphus/evidence/task-11-squash-merge-blocked.txt
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  - 리포트 파일 존재 여부, 6축 섹션 유무, P0-P3 심각도, 근거 파일 경로, `tech_contract` 비확정 상태, 단일 후속 질문 여부를 점검한다.
  - Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  - 진단 과정에서 사용한 명령, 리포트 구조, 마크다운 정합성, 민감 정보 마스킹 여부를 확인한다.
  - Output: `Commands [PASS/FAIL] | Report Structure [PASS/FAIL] | Secret Hygiene [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  - 각 태스크의 QA 시나리오를 실제로 따라가며, 리포트 파일과 증거 파일이 계획과 일치하는지 확인한다.
  - Output: `Scenarios [N/N pass] | Evidence [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  - 리포트 생성 범위를 넘어선 변경(예: 코드 수정, `.impeccable.md` 생성, 추가 산출물 생성)이 없는지 확인한다.
  - Output: `Scope [PASS/FAIL] | Extra Changes [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **중간 커밋 없음 권장**: 진단 및 리포트 생성은 하나의 흐름으로 유지한다.
- **최종 커밋 예시**: `docs(tech-improve): add darun technical health report`
- **Pre-commit**: `pnpm lint && pnpm typecheck && pnpm test`

---

## Success Criteria

### Verification Commands
```bash
test -f .sisyphus/tech-improve/darun-20260421.md || test -f .sisyphus/tech-improve/darun-20260421-*.md
grep -c "^## .*Architecture\|^## .*Code Quality\|^## .*Tests\|^## .*Performance\|^## .*Security\|^## .*DX" .sisyphus/tech-improve/darun-20260421*.md
grep -cE "P[0-3]" .sisyphus/tech-improve/darun-20260421*.md
```

### Final Checklist
- [ ] 모든 "Must Have" 충족
- [ ] 모든 "Must NOT Have" 부재
- [ ] 리포트 저장 완료
- [ ] 후속 질문 1회만 수행
- [ ] main squash merge 및 브랜치 정리 완료
