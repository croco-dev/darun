# Security Scan Rollout Plan

**Status:** Draft  
**Scope:** PR CI (`PullRequest.yaml`) only  
**Out of scope:** `Deploy.yaml`, `Production.yaml` (see below)

---

## Current State

| Area | Status |
|------|--------|
| Dependency updates | Dependabot weekly (npm + github-actions) |
| Vulnerability scanning | None |
| SAST | None |
| Secret detection | None |
| PR CI steps | lint → typecheck → test → build |

Dependabot raises PRs when new versions are available, but it doesn't block merges on known CVEs. There's no step that fails a PR when a dependency has a published vulnerability.

---

## Option Comparison

### 1. `pnpm audit` (built-in)

| | |
|---|---|
| **What it does** | Queries the npm advisory database for known CVEs in installed packages |
| **Setup cost** | Zero. Already available via `pnpm` |
| **CI time added** | ~5-15s (network call to registry) |
| **False positive rate** | Low for direct deps; moderate for transitive deps |
| **Blocking behavior** | Exits non-zero on any vulnerability by default; `--audit-level=high` limits to high/critical only |
| **Maintenance** | None. Advisory DB is maintained by npm |
| **Cost** | Free |

**Verdict:** Best fit for phase 1. Lowest friction, no new tooling, already in the pnpm toolchain.

---

### 2. CodeQL (GitHub)

| | |
|---|---|
| **What it does** | Static analysis (SAST) for code-level vulnerabilities: injection, XSS, prototype pollution, etc. |
| **Setup cost** | Requires a separate workflow file and language config |
| **CI time added** | 3-10 min per run (full code analysis) |
| **False positive rate** | Moderate; requires triage |
| **Blocking behavior** | Configurable via GitHub code scanning alerts |
| **Maintenance** | Query packs updated by GitHub; occasional config updates needed |
| **Cost** | Free for public repos; included in GitHub Advanced Security for private repos |

**Verdict:** Strong long-term option for SAST. Too heavy for phase 1 given the current CI baseline.

---

### 3. Semgrep

| | |
|---|---|
| **What it does** | Rule-based SAST; fast, composable, supports custom rules |
| **Setup cost** | One workflow step + rule selection |
| **CI time added** | 30-90s depending on rule set |
| **False positive rate** | Low with curated rule sets (e.g., `p/typescript`, `p/nodejs`) |
| **Blocking behavior** | Exits non-zero on findings; configurable severity threshold |
| **Maintenance** | Rule sets updated by Semgrep; opt-in to new rules |
| **Cost** | Free tier available; paid for advanced rules and dashboards |

**Verdict:** Good phase 2 candidate after dependency audit is stable.

---

### 4. Snyk

| | |
|---|---|
| **What it does** | Dependency vulnerability scanning + license compliance + container scanning |
| **Setup cost** | Requires Snyk account + API token secret |
| **CI time added** | 30-60s |
| **False positive rate** | Low; Snyk maintains its own curated advisory DB |
| **Blocking behavior** | Configurable severity threshold |
| **Maintenance** | Managed by Snyk; requires token rotation |
| **Cost** | Free tier: 200 tests/month. Paid for unlimited + team features |

**Verdict:** Viable alternative to `pnpm audit` with richer reporting, but adds an external dependency and secret management overhead. Better suited for phase 2 if `pnpm audit` coverage proves insufficient.

---

## Recommended Phase 1

**Tool:** `pnpm audit --audit-level=high`  
**Target workflow:** `PullRequest.yaml`  
**Placement:** After `pnpm install`, before lint

```
Install dependencies
  → pnpm audit --audit-level=high   ← NEW
  → lint
  → typecheck
  → test
  → build
```

**Why `--audit-level=high`:**  
Starting with `high` (not `moderate` or `low`) avoids blocking PRs on low-severity advisories that are often transitive and not exploitable in this context. The threshold can be tightened once the team has a baseline of known issues resolved.

**Expected CI time impact:** +5-15s per PR run.

**Rollout steps:**

1. Add `pnpm audit --audit-level=high` step to `PullRequest.yaml`
2. Run once locally to identify any existing high/critical advisories
3. Resolve or `pnpm audit --fix` for auto-fixable issues before enabling the step as blocking
4. Enable as a required status check in branch protection rules

**Failure handling:**  
If `pnpm audit` finds a vulnerability, the PR is blocked. The developer must either upgrade the affected package or add a documented exception via `pnpm audit --ignore` with a justification comment in the PR.

---

## CI Impact Summary

| Tool | Added time | Blocking | Setup effort |
|------|-----------|----------|--------------|
| `pnpm audit` | 5-15s | Yes (configurable) | None |
| Semgrep | 30-90s | Yes (configurable) | Low |
| CodeQL | 3-10 min | Yes (configurable) | Medium |
| Snyk | 30-60s | Yes (configurable) | Low-Medium |

Current PR CI baseline (lint + typecheck + test + build) runs in approximately 2-4 minutes. Adding `pnpm audit` keeps the total under 5 minutes.

---

## Out of Scope

**`Deploy.yaml` and `Production.yaml` are not modified in any phase.**

Reasons:

1. Both workflows run after code has already passed PR CI. Security gates belong at the PR stage, not at deploy time.
2. Deploy workflows carry production secrets (AWS keys, database URLs, Firebase credentials). Adding new steps to these files increases the blast radius of any misconfiguration.
3. Deployment pipelines have different failure semantics. A failed security scan mid-deploy could leave infrastructure in a partial state.
4. The correct model is: block at PR, deploy only clean code. Not: allow merge, scan at deploy.

Any future hardening of deploy pipelines (e.g., container image scanning, SBOM generation) is a separate initiative and requires dedicated planning.

---

## Phase 2 Candidates (not in scope now)

- Semgrep with `p/typescript` + `p/nodejs` rule sets in PR CI
- CodeQL as a scheduled weekly scan (separate workflow, non-blocking initially)
- Snyk if `pnpm audit` advisory coverage proves insufficient
- Secret scanning via `gitleaks` or GitHub's built-in secret scanning
