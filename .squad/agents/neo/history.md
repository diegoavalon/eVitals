# Neo History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial validation requirements come from `app/docs/00_Initial.md`: cover URL/config validation, Lighthouse parsing, metric/category extraction, status thresholds, priority ranking, manifest generation, partial run failures, retention pruning, and static report paths.

## Issue #2 — Review (2026-06-02, post-Trinity implementation)

**Verdict:** ⚠️ CONDITIONAL REJECT — 2 blocking findings

**Test results:** `npm test` 7/7 ✅ | `npm run build` clean ✅

**BLOCKING-1 — `/ui` components not used in Home route**  
`app/routes/home.tsx` uses design-system CSS variable tokens but no `app/components/ui/` component. AC requires both CSS variables *and* `/ui` components. Hand-rolled `StatusBadge` does not satisfy the criterion.

**BLOCKING-2 — `reports/runs/` architecture not implemented**  
User directive requires fixture files placed under `reports/runs/...` until real data arrives. `dashboardData.json` references `reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.{html,json}` but no such directory exists anywhere in the repo. Fixtures remain under `fixtures/` only.

**Non-blocking:**  
- Misleading test name: "invalid state when body is malformed JSON string" — asserts `missing` (correct behavior, wrong label).
- No UI-level rendering tests for Home states.
- `app/root.tsx` and `app/routes.ts` are non-functional stubs.

**Decision file:** `.squad/decisions/inbox/neo-review-issue-2.md`

---

## Issue #2 — Re-check (2026-06-02, post-Morpheus blocker-fix)

**Verdict:** ✅ **APPROVE**

**Context:** Morpheus performed blocker-fix revision (Trinity locked out). Both BLOCKING-1 and BLOCKING-2 marked resolved.

**Verification:**
- BLOCKING-1: `EhiButton` (variant="link") now rendered as "View Report" on each page success row → `/ui` component criterion satisfied
- BLOCKING-2: Fixture files (`homepage.mobile.report.{html,json}`) verified present at `public/reports/runs/2026-06-02T14-00-00Z/` → static serving architecture established

**Test results:** `npm test` 7/7 ✅ | `npm run build` clean ✅

**Status:** Issue #2 approved for merge; all acceptance criteria satisfied

---

## Issue #3 — Initial Review (2026-06-02, post-Trinity implementation)

**Verdict:** ❌ **REJECT** — 1 blocking finding

**Test results:** `npm test` 89/89 ✅ | `npm run typecheck` clean ✅ | `npm run build` clean ✅

**BLOCKING-1 — Consumer-layer cross-field validation missing**  
`parseDashboardConfig` exported from `~/lib/config/schemas.ts` (Layer 2, primary runtime path) does not enforce `defaultCategory ∈ enabledCategories`. Layer 1 (raw Zod, `config.schemas.ts`) correctly implements the rule via `superRefine` and is tested. Layer 2 was missing the same validation, allowing a malformed config like `{ defaultCategory: "seo", enabledCategories: ["performance"] }` to pass validation and reach the app as `{ status: "ready" }`, resulting in UI displaying a disabled category as default.

**Required fix:** Add `superRefine` to `DashboardConfigSchema` in `app/lib/config/schemas.ts` + corresponding test in `dashboardConfig.test.ts`.

**Non-blocking observations:**  
- Trinity's two-layer architecture decision is sound and well-documented
- Integration in `App.tsx` with config gating (four states) is well-structured
- Test coverage is comprehensive (89 total): 48 contract + 34 consumer + 7 pre-existing
- No design/data scope drift; fixtures are synced correctly

**Decision file:** `.squad/decisions/inbox/neo-review-issue-3.md`

**Policy:** Trinity locked out per reviewer-gated cycle. Morpheus assumes blocker-fix revision.

---

## Issue #3 — Blocker-Fix Revision (2026-06-02, post-Morpheus fix)

**Agent:** Morpheus (Lead, revision owner)  
**Changes:** Added `superRefine` to Layer 2 `DashboardConfigSchema` + test case covering `defaultCategory ∉ enabledCategories` scenario  
**Test results:** `npm test` 90/90 ✅ (89 pre-existing + 1 new) | `npm run typecheck` clean ✅ | `npm run build` clean ✅

---

## Issue #3 — Re-check (2026-06-02, post-Morpheus blocker-fix)

**Verdict:** ✅ **APPROVE**

**Verification:**
- BLOCKING-1 resolved: `superRefine` cross-field validation correctly enforces `defaultCategory ∈ enabledCategories` in Layer 2 consumer API
- Test coverage added: new test case asserts `success: false` when `defaultCategory` not in `enabledCategories`, with proper error path and message
- All gate criteria satisfied: 7/7 criteria re-checked; all passing

**Test results:** `npm test` 90/90 ✅ | `npm run typecheck` clean ✅ | `npm run build` clean ✅

**Status:** Issue #3 approved for merge; blocker resolved; Trinity two-layer decision preserved intact

---

## Issue #2 — Walking skeleton: static app shell + seed Home render

**Date:** 2026-06-02

**What was done:**
- Installed Vitest, @testing-library/react, @testing-library/user-event, jsdom, @vitejs/plugin-react.
- Created `vitest.config.ts` (jsdom env, globals) and `vitest.setup.ts` (@testing-library/jest-dom).
- Added `"test": "vitest run"` script to `package.json`.
- Created `app/lib/dashboard.types.ts`: `DashboardData`, `FetchState<T>`, `PageEntry`, `DeviceResult` types.
- Created `app/lib/useDashboardData.ts`: reference fetch hook covering all four states.
- Created `public/data/dashboardData.json`: seed fixture matching `DashboardData` schema.
- Created `app/__tests__/useDashboardData.test.tsx`: 7 tests covering loading, missing/404, network error, invalid JSON, and success states — all passing.
- Created `.squad/decisions/inbox/neo-issue-2-test-checklist.md`: reviewer checklist for Trinity approval.

**Test result:** `Tests 7 passed (7)` ✅

**Key decisions / learnings:**
- Project uses pnpm workspaces — must use `pnpm add` not `npm install`.
- `vite.config.ts` uses `@react-router/dev/vite` plugin (React Router v7 framework mode). A separate `vitest.config.ts` is needed to avoid the react-router plugin conflicting with Vitest.
- Malformed JSON parse errors fall through `catch` → `missing` state (not `invalid`). A distinct `parse-error` state would require Trinity's design decision before testing.
- Trinity may relocate or rename `useDashboardData`; if so, tests must be updated to keep four-state coverage intact.

## Issue #3 — Config Validation Contracts (2026-06-03)

**Date:** 2026-06-03

**What was done:**
- Installed `zod` via pnpm.
- Created `app/lib/config.schemas.ts`: Zod schemas + `parsePageRegistry` / `parseDashboardConfig` parse functions, exported TypeScript types (`PageRegistryEntry`, `PageRegistry`, `DashboardConfig`).
- Created `dashboard.config.json` at repo root as the canonical dashboard config fixture.
- Created `app/__tests__/config.validation.test.ts`: 48 contract tests across both schemas covering valid inputs, required fields, URL validity, id uniqueness, cross-field validation (defaultCategory ∈ enabledCategories), invalid types and ranges, unknown fields (strict mode), and non-object inputs.
- Created `.squad/decisions/inbox/neo-issue-3-test-checklist.md`: reviewer gate checklist for Trinity's implementation.

**Test result:** `Tests 55 passed (55)` ✅ (48 new + 7 pre-existing)

**Key decisions / learnings:**
- Zod `.strict()` chosen for both schemas — unknown extra fields are rejected to enforce tight contracts. Trinity may loosen to `.strip()` if forward-compat passthrough is needed; the "unknown fields" tests must then be updated.
- Cross-field rule (defaultCategory must be in enabledCategories) is enforced via `superRefine` — this is a deliberate business-rule constraint from the PRD.
- `VALID_CATEGORIES` and `VALID_DEVICES` are exported as const arrays so runner/parser modules can reuse them without re-declaring the allowed values.
- `dashboard.config.json` does not yet exist as a tracked fixture — created here as the authoritative v1 shape.
- If Trinity places the validation module under `scripts/lib/` rather than `app/lib/`, the `~/lib/config.schemas` import alias will break and the test file must be updated.

---

## Issue #4 — Lighthouse Parsing + Status Classification QA (2026-06-03, in-parallel)

**Date:** 2026-06-03

**What was done:**
- Implemented typed result model in `app/lib/lighthouse/types.ts`: `LighthouseRunResult`, `LighthouseMetrics`, `LighthouseCategoryScores`, `MetricStatus`, `RunStatus`, `ParseReportOptions`.
- Implemented `app/lib/lighthouse/classifyStatus.ts`: `classifyLcp`, `classifyCls`, `classifyTbt`, `classifyCategoryScore`, `classifyPerformanceStatus` with exported threshold constants.
- Implemented `app/lib/lighthouse/parseReport.ts`: `parseLighthouseReport(raw, opts) → LighthouseRunResult` with degraded-value policy (missing/NaN → 0).
- Created `app/__tests__/lighthouse/classifyStatus.test.ts`: 42 boundary tests covering all LCP/CLS/TBT/category thresholds (at/below/above) and worst-of performance logic.
- Created `app/__tests__/lighthouse/parseReport.test.ts`: 39 fixture-driven contract tests using real `fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json`.
- Created `.squad/decisions/inbox/neo-issue-4-test-checklist.md`: full reviewer gate checklist including interface contract Trinity must satisfy.

**Test result:** `Tests 171 passed (171)` ✅ (42 classify + 39 parse contract + 90 pre-existing)

**Key decisions / learnings:**
- Fixture confirms: LCP=2863ms (needs-improvement), CLS=0.020 (good), TBT=2040ms (failing) → overall `failing`. Score extraction: `Math.round(score * 100)`.
- `run-failed` is intentionally NOT set by the parser — it is the runner's responsibility when Lighthouse produces no report. Parser always returns a metric-derived status.
- Lighthouse category scores are 0.0–1.0 raw; result model exposes 0–100 integers.
- Extra categories (e.g. `agentic-browsing`) are passed through as additional keys in `categoryScores`.
- Threshold constants are exported from `classifyStatus.ts` so boundary tests reference them without magic numbers — critical for maintainability.
- `DeviceResult` (dashboard.types.ts) is the compact dashboard JSON shape; `LighthouseRunResult` is the richer intermediate model. Issue #5 data generator bridges the two.
- If Trinity replaces implementations, tests act as the spec; module paths and exported API surface must match or tests must be updated in the same PR.

---

## Issue #3 — Review (2026-06-03, post-Trinity implementation)

**Verdict:** ❌ **REJECT** — 1 blocking finding

**Test results:** `npm test` 89/89 ✅ | `npm run typecheck` clean ✅ | `npm run build` clean ✅

**Architecture:** Trinity implemented a two-layer approach (documented in `trinity-issue-3.md`):
- Layer 1 `app/lib/config.schemas.ts`: strict, no defaults, raw Zod returns, cross-field rule ✅
- Layer 2 `app/lib/config/`: strip, defaults, clean `ParseResult<T>` API

**BLOCKING-1 — Cross-field rule absent from consumer API**  
`parseDashboardConfig` from `~/lib/config` (used by `useDashboardConfig` → `App.tsx` at runtime)
does **not** enforce `defaultCategory ∈ enabledCategories`. `app/lib/config/schemas.ts` has
no `superRefine` for this rule, and `app/__tests__/config/dashboardConfig.test.ts` has no
test for it. A logically inconsistent config (defaultCategory not in enabledCategories)
passes layer-2 validation and reaches the app in `ready` state.

**Fix required:**  
1. Add `superRefine` cross-field check to `DashboardConfigSchema` in `app/lib/config/schemas.ts`.
2. Add test in `app/__tests__/config/dashboardConfig.test.ts` asserting `success: false` when
   `defaultCategory` is absent from `enabledCategories`.

**Non-blocking:**
- Two-layer architecture is clean and well-documented.
- `App.tsx` config gating and `useDashboardConfig.ts` implementation are correct.
- No extra seed data, no design changes, `/reports/runs/...` architecture untouched.
- 89 tests across 4 files; coverage is comprehensive except for the one missing cross-field case.

**Decision file:** `.squad/decisions/inbox/neo-review-issue-3.md`

### Conflict resolution (2026-06-03)
- Trinity's in-flight implementation had conflicting API: status vocabulary `"pass"/"fail"` vs Neo's `"good"/"failing"`, null-metric semantics vs 0 fallback, 0.0-1.0 scores vs 0-100, `enabledCategories` in opts.
- Neo deferred to Trinity's implementation (owner of feature).
- Updated `types.ts` to canonical shared types matching Trinity's `parser.ts`.
- Removed Neo's redundant `classifyStatus.ts` and `parseReport.ts` (Trinity owns via `thresholds.ts` and `parser.ts`).
- Rewrote Neo's test files to use `~/lib/lighthouse` public index (Trinity's API).
- Final: 261/261 ✅ | `npm run typecheck` clean ✅.
- Non-blocking: status naming diverges from PRD (`"pass"/"fail"` vs `"good"/"failing"`); issue #5 must reconcile.
