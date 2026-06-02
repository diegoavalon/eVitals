# Neo History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial validation requirements come from `app/docs/00_Initial.md`: cover URL/config validation, Lighthouse parsing, metric/category extraction, status thresholds, priority ranking, manifest generation, partial run failures, retention pruning, and static report paths.

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
