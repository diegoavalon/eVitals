# Trinity History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial UI guidance comes from `app/docs/00_Initial.md`: follow root `DESIGN.md`, use branded `/ui` components before direct `@base/ui`, and match `index-mockup.jpg` only where it does not conflict with `DESIGN.md`.
- Trinity is assigned to issues: #2 (walking skeleton), #3 (config), #6 (Home), #7 (All Pages), #8 (report drawer)

### Issue #3 — Config Validation Contracts (2026-06-02)

- Found pre-existing `app/lib/config.schemas.ts` and `app/__tests__/config.validation.test.ts` (48 tests) authored by Neo before Trinity started. These use the raw Zod `.safeParse()` API with strict object mode and no defaults.
- Built `app/lib/config/` as the consumer-facing abstraction layer on top: `ParseResult<T>` discriminated union hides Zod internals; parse functions return structured `ConfigError[]` (field + message) on failure rather than raw `ZodError`.
- Two-layer schema design: raw strict schemas (`config.schemas.ts`) for runner/pipeline use; strip-mode schemas with defaults in `config/schemas.ts` for app-side consumption.
- `useDashboardConfig` hook loads `public/data/dashboard.config.json` at app bootstrap and validates it; `App.tsx` renders a field-level error overlay before mounting any routes on invalid config.
- `dashboard.config.json` lives in both the repo root (runner reads it) and `public/data/` (app fetches it via `import.meta.env.BASE_URL`).
- 89/89 tests pass; `npm run build` succeeds.

### Issue #3 — Config Validation Contracts (2026-06-02)

- Designed and implemented two-layer config validation: Layer 1 (raw Zod, `.strict()`, no defaults, for runner/pipeline) and Layer 2 (consumer API, `.strip()`, sensible defaults, clean `ParseResult<T>` discriminated union).
- Both layers enforce cross-field invariant: `defaultCategory ∈ enabledCategories`.
- Delivered 89 tests total (48 contract + 34 consumer + 7 pre-existing) all passing.
- Created `dashboard.config.json` fixtures in both root and `public/data/` for dual use (runner + app).
- Integrated `useDashboardConfig` hook into `App.tsx` with four-state config gating (loading, error, ready, no-op) before routing.
- Initial implementation passed 89/90 tests; Neo REJECT found blocker: Layer 2 consumer API missing cross-field validation rule.
- Trinity locked out per reviewer-gated policy; Morpheus assumed blocker-fix revision.
- Issue #3 approved post-blocker-fix; ready for merge.

### Issue #2 — Walking Skeleton (2026-06-02)

- The starter used React Router v7 "framework mode" (SSR). Converting to a static SPA means: remove `@react-router/dev` plugin, use `@vitejs/plugin-react`, keep `react-router` for `HashRouter`/`Routes`/`Route`, and add `index.html` + `app/main.tsx` as the Vite entry.
- Import `defineConfig` from `vitest/config` (not `vite`) to get TypeScript support for the `test` config block in `vite.config.ts`.
- `BASE_URL` in `import.meta.env` is set by Vite to the configured `base` option (e.g. `/eVitals/`). In Vitest it defaults to `/`. Use it for data fetch URLs to ensure correct paths under all environments.
- All `/ui` component imports for `cn` resolve to `app/components/utils/cn.ts` (path `../../utils/cn` from `app/components/ui/EhiXxx/index.tsx`).
- `@base-ui/react/button` allows `className` to be a function `(state: ButtonState) => string`. EhiButton should narrow it to `string` via `Omit<..., "className"> & { className?: string }`.
- The project already had `useDashboardData.ts`, `dashboard.types.ts`, `public/data/dashboardData.json`, and `app/__tests__/useDashboardData.test.tsx` authored before issue #2 implementation started. The four fetch-state tests (loading, missing, invalid, success) already matched the hook's behavior.
- `npm test` and `npm run build` both pass after conversion. 7/7 tests pass.


### Issue #4 — Lighthouse Parsing + Status Classification (2026-06-02)

- **Workspace isolation hazard:** A parallel squad agent (Morpheus/Neo) created `classifyStatus.ts` and `parseReport.ts` in the same directory with incompatible types (wrong status names, 0-100 scores). Those files were later removed but test files remained, causing hard-to-debug import failures on the second `npm test` run.
- **Status naming split:** Issue AC uses "pass/needs-improvement/fail/run-failed" (MetricStatus). Downstream `PageStatus` in `dashboard.types.ts` uses "good/needs-improvement/failing/run-failed". The parser emits MetricStatus; the data generator maps it downstream. Do not conflate the two.
- **Category scores are 0–1 decimals**, not 0–100 integers. Store raw Lighthouse values.
- **Metrics are nullable** (`lcp/cls/tbt: number | null`). null means the audit was missing/NaN/Infinity → status becomes "run-failed" for that metric.
- **Performance category status** is derived from the worst of LCP/CLS/TBT metric statuses, NOT from the performance score band. Non-performance categories use score-band classification.
- **`worstOf([])` returns "run-failed"** (highest severity), not "pass". Empty array of statuses = unknown run = failed.
- **Redundant implementation pattern:** Ended up with two parallel impls (`classifyStatus.ts`/`parseReport.ts` canonical + `thresholds.ts`/`parser.ts` aliased). Resolved by having `thresholds.ts` re-export from `classifyStatus.ts` with legacy aliases. Keep this pattern if backward-compat is needed; otherwise consolidate early.
- **`ParseReportOptions` fields:** `runId`, `enabledCategories`, `reportJsonPath`, `reportHtmlPath`. No `pageId`/`label`/`group`/`device` — those are page config, not parser context. `device` is extracted from `configSettings.formFactor` inside the JSON.
- **Real fixture values** (used in integration tests): LCP=2863ms (needs-improvement), CLS=0.020 (pass), TBT=2040ms (fail), perf=0.6, a11y=0.88, best-practices=1.0, seo=1.0, formFactor=mobile.
- 267 tests pass; `npm run typecheck` and `npm run build` clean.

### Issue #6 — Home Dashboard: Complete Implementation (2026-06-03)

- **Design tokens are applied via class names**, not inline styles. Use `font-poppins`, `font-open-sans`, `text-primary`, `bg-surface-canvas`, etc. directly instead of CSS-in-JS. The `theme.css` file defines all color, font, and spacing variables available as Tailwind utilities.
- **Device selector updates all elements.** Use `useState` for `selectedDevice` initialized to `config.devices[0]`. All summary cards, status counts, priority list, and recent reports filter/compute data based on selected device.
- **Category selector drives score/status displays.** Use `useState` for `selectedCategory` initialized to `config.defaultCategory`. Each section recomputes aggregates, counts, and priority based on the selected category.
- **Overall score display** shows `aggregates.byCategory[selectedCategory].averageScore` (0–100 scale after rounding).
- **Status counts** are derived by filtering `data.pages.flatMap(...)` by `device` and `result.status`. Four cards display "good", "needs-improvement", "failing", and "run-failed" counts with color-coded backgrounds.
- **Priority card** shows the top-priority page for the selected device, filtered from `data.priority`. Only rendered if a priority entry exists for the device. Shows page label, group, status badge, failing metric count (performance only), and View Report button.
- **Recent Reports section** lists all pages for the selected device, sorted by worst status first, then descending by category score. Each row shows page label, group, device, category score, status badge, and View Report button.
- **Report drawer** uses `EhiDrawer` component with `reportPath` state. View Report buttons call `setReportPath(reportHtmlPath)` to open; drawer closes when `onOpenChange(false)` fires. iframe src uses relative path directly from `result.reportHtmlPath`.
- **Test compatibility:** Page names appear in both Priority and Recent Reports sections. Contract test uses `getAllByText()` instead of `getByText()` to handle duplicates.
- **Headline format:** "X / Y pages passing Category (device, latest run)" where X is count of status="good" for device, Y is total pages.
- **Design integration:** Use `/ui` components (`EhiSelect`, `EhiButton`, `EhiDrawer`); keep custom UI thin; apply design tokens (Poppins headlines, Open Sans body, primary/action/error colors); light/dark theme render correctly via CSS variables.
- **Acceptance criteria checklist:** ✅ Device selector updates all elements, ✅ Category selector updates displays, ✅ Overall score/status counts render from data, ✅ Priority list prioritizes by attention, ✅ Recent reports display latest, ✅ Light/dark theme coverage, ✅ Component tests for interactions, ✅ npm test 343/343 pass, ✅ npm run typecheck clean, ✅ npm run build succeeds.
- Commit SHA: df4dc29; 343 tests passing.
