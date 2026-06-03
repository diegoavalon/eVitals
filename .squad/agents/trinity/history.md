# Trinity History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.
- Initial UI guidance comes from `app/docs/00_Initial.md`: follow root `DESIGN.md`, use branded `/ui` components before direct `@base/ui`, and match `index-mockup.jpg` only where it does not conflict with `DESIGN.md`.
- Trinity is assigned to issues: #2 (walking skeleton), #3 (config), #6 (Home), #7 (All Pages), #8 (report drawer)
- **Issue #2 (Walking Skeleton):** Converted React Router v7 SSR starter to static SPA using Vite + React Router (HashRouter). Integrated `useDashboardData` hook for data fetches. All 7 tests passing.
- **Issue #3 (Config Validation):** Two-layer config schema (raw Zod for runner + consumer API for app). Integrated `useDashboardConfig` hook into App.tsx with error gating. All 89 tests passing.
- **Issue #4 (Lighthouse Parsing):** Status classification model (MetricStatus enum) with nullable metrics. Performance status derived from metric worst-of, not score band. Category scores stored as 0–1 decimals. 267 tests passing.
- **Issue #6 (Home):** Device/category selectors control all score/status/priority displays. Uses pre-computed aggregates from dashboard data. Report drawer uses iframe + `EhiDrawer` modal. All components use design-system tokens for theme support.
- **Issue #7 (All Pages):** Pages grouped by `group` label with collapsible headers. Sparkline visualization (LCP history). Delta indicator (% change vs prior). Status-driven row styling. Route added at `/all-pages`. 17 tests covering UI interactions.
- GitHub Pages path hardening: centralize URL building with a `withBasePath()` helper and route all static fetch/report links through it (`data/*.json`, `reports/runs/*`) to keep local dev (`/`) and project pages (`/eVitals/`) aligned.
- Vite `base` should be normalized from env (empty/relative/without slashes) before build to avoid brittle asset URL generation across CI and local runs.

### Orchestration: GitHub Pages Deployment Fix Coordination (2026-06-03)

**Completion Date:** 2026-06-03T17:00:42Z

In parallel, Trinity (manifest schema + run ID detection), Tank (generator failures visibility), and Switch (Lighthouse CLI fix) completed investigations into why GitHub Pages deployment showed no metrics. Root causes identified and fixed:

1. **Trinity's Fix:** Manifest schema corrected and run ID detection logic fixed → dashboard parsing works end-to-end, metrics render on pages
2. **Tank's Fix:** Generator now preserves failed runs instead of filtering them → users see audit failures instead of empty dashboard
3. **Switch's Fix:** Lighthouse CLI dependency restored audit execution in workflow

**Cross-Agent Context:** These three fixes complete the end-to-end Lighthouse data flow for issue #11 (GitHub Pages publication). All 419 tests passing. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-00-42Z-{agent}.md` and session consolidated in `.squad/log/2026-06-03T17-00-42Z-pages-lighthouse-rendering.md`. Decisions merged to `.squad/decisions.md` (now 24.9 KB with 5 new entries).

**Artifact Flow Verification Complete:**
- ✅ Manifest schema matches `RunManifest` type expectations
- ✅ Run ID detection handles null checks and custom date format
- ✅ `latestRunId` properly detected and set
- ✅ Dashboard parsing consumes manifests correctly
- ✅ Generated `dashboardData.json` contains valid metrics
- ✅ Published page renders Lighthouse metrics live from generated data

### Orchestration: Static Assets 404 Fix (2026-06-03)

**Completion Date:** 2026-06-03T17:42:23Z

Follow-up coordination between Trinity and Switch to resolve remaining asset and URL issues on GitHub Pages deployment:

1. **Trinity's Base-Path Resolution Fix:** Created centralized `withBasePath` utility for frontend URL composition across environments (local dev `/`, GitHub Pages `/eVitals/`, custom bases). Updated all static JSON fetches (`data/dashboardData.json`, `data/dashboard.config.json`) and report iframe links (`reports/runs/*`) to use normalized base paths. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-42-23Z-trinity-pages-assets-fix.md`.

2. **Switch's Asset Path Fix:** Diagnosed and fixed asset nesting during workflow merge. Solution: atomic `public/assets` replacement (`rm -rf` + copy with trailing dot) + `VITE_BASE_PATH` environment setup from repository name. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-42-23Z-switch-pages-assets-audit.md`.

**Session Consolidated:** `.squad/log/2026-06-03T17-42-23Z-pages-static-assets-not-found.md`

**Decisions Recorded:**
- "Normalize Frontend Base-Path URL Resolution" (Trinity)
- "GitHub Pages Assets Path Integrity" (Switch)

**Impact:** Combined fixes ensure all URLs resolve correctly (Trinity) and assets deploy deterministically without nesting (Switch). All 419 tests passing. No further 404 errors for assets, data, or reports across all environments.
