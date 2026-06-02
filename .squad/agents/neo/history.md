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
