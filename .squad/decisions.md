# Squad Decisions

## Active Decisions

### eHealth Core Web Vitals Dashboard Architecture (Morpheus)

**Issue:** https://github.com/diegoavalon/eVitals/issues/1  
**Status:** Approved  
**Owner:** Morpheus

**Decision:** Build v1 as a static GitHub Pages dashboard. Keep source, configuration, tests, and runner scripts on main branch; publish generated site assets, dashboard data, run manifests, Lighthouse JSON reports, and Lighthouse HTML reports to the gh-pages branch.

Use deep, testable module boundaries for:
- Configuration validation
- Lighthouse task orchestration
- Lighthouse report parsing
- Core Web Vitals/category status classification
- Dashboard data generation
- Manifest generation
- Retention pruning
- Static client data loading/selectors
- Report iframe presentation

**Rationale:** Preserves simple static architecture from handoff while making each complex concern independently testable. Avoids always-on server, keeps page/device Lighthouse failures visible as partial run data, and gives React UI compact generated dashboard data instead of requiring browser-side parsing of full Lighthouse JSON.

**Consequences:**
- GitHub Actions owns daily/manual Lighthouse execution and publication
- Browser reads generated static JSON and saved report references
- Tests can focus on external module behavior: config contracts, parsing, status rules, aggregation, retention, and user-visible dashboard interactions

### Issue Slicing: 10 Tracer-Bullet Vertical Slices (Morpheus)

**Issue:** https://github.com/diegoavalon/eVitals/issues/1  
**Status:** Approved by Diego Avalon  
**Owner:** Morpheus

**Decision:** The PRD (issue #1) is decomposed into 10 independently deliverable, vertically-sliced GitHub issues with clear dependency ordering. Each slice delivers external-behavior value. Issues #2–#11 are published under parent #1 with dependency correction applied: issue #11 is blocked by #9, #10, and #2.

**Rationale:**
- Sequential UI track (#2→#3→#4→#5→#6→#7→#8) ensures the client always renders from real generated data before UI features are added
- Runner track (#5→#9→#10→#11) starts after data contracts are stable, so the runner outputs to a known schema
- CI/workflow issue (#11) is HITL because it requires human verification of GitHub Pages settings and real `workflow_dispatch` confirmation
- All other issues are AFK (fully autonomous agent implementation)

**Consequences:**
- Team begins autonomous implementation phase across 10 issues with clear dependencies
- Trinity owns UI/client layers (#2–#3, #6–#8)
- Tank owns data/runner layers (#4–#5, #9–#10)
- Switch owns CI/deployment (#11)
- Neo owns test coverage across all layers

### Issue #2: Walking Skeleton Implementation (Trinity)

**Issue:** https://github.com/diegoavalon/eVitals/issues/2  
**Status:** Approved (post-blocker-fix)  
**Owner:** Trinity  
**Reviewer:** Neo

**Decisions:**

#### 1. React Router v7 Framework Mode → Plain Static SPA (Trinity)
- **Decision:** Removed `@react-router/dev`, `@react-router/node`, `@react-router/serve`; replaced with `@vitejs/plugin-react` + `HashRouter`
- **Rationale:** Framework mode requires Node server; GitHub Pages is static-only. `HashRouter` keeps routing 100% client-side using URL hash.
- **Impact:** Enables static deployment; entry point now `index.html` → `app/main.tsx` → `app/App.tsx`

#### 2. Vitest Configuration (Trinity)
- **Decision:** Import `defineConfig` from `vitest/config` instead of `vite` so `vite.config.ts` can omit Vitest while `vitest.config.ts` stands alone
- **Rationale:** Avoids React Router v7 framework mode plugin interfering with Vitest
- **Impact:** Test infrastructure isolated; reference implementation (fetch hook + 7 tests) delivered by Neo

#### 3. Data Path via `import.meta.env.BASE_URL` (Trinity)
- **Decision:** Dynamic path using `${import.meta.env.BASE_URL}data/dashboardData.json` instead of hardcoded `/data/dashboardData.json`
- **Rationale:** Works correctly under both dev (`/`) and gh-pages (`/eVitals/`) deployments
- **Impact:** Base path fully configurable via Vite + Vitest env defaults

#### 4. `cn` Utility at `app/components/utils/cn.ts` (Trinity)
- **Decision:** Minimal class-name joiner; no `clsx` or `tailwind-merge` dependencies in v1
- **Rationale:** Lightweight, sufficient for current scope
- **Impact:** Supports branded `/ui` component pipeline

#### 5. `EhiButton.className` Narrowed to `string` (Trinity)
- **Decision:** `EhiButtonProps = Omit<BaseUIButton, "className"> & { className?: string }` enforces string-only classNames
- **Rationale:** Base UI allows `className` as function; `cn()` only accepts strings. Wrapper enforces contract.
- **Impact:** Eliminates TypeScript errors; `/ui` components ready for Home integration

#### 6. Fixture Schema Preserved; `dashboardData.json` Seeded (Trinity + Neo)
- **Decision:** Use existing fixture file already in `public/data/dashboardData.json`; added `PageStatus` export to types
- **Rationale:** Fixture was already present and valid; avoids inventing new data
- **Impact:** Seed data matches `DashboardData` schema; tests cover all four fetch states (loading, missing, invalid, success)

#### 7. `/ui` Component Integration in Home Route (Morpheus — Blocker Fix)
- **Decision:** Added `EhiButton` (variant="link") as "View Report" action on each page success row
- **Rationale:** Neo's BLOCKING-1 required at least one `/ui` component in rendered output
- **Impact:** Home now uses both design-system tokens and `/ui` components; acceptance criterion satisfied

#### 8. Fixture Files Placed Under `public/reports/runs/` (Morpheus — Blocker Fix)
- **Decision:** Copied `fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.{html,json}` to `public/reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.{html,json}`
- **Rationale:** Neo's BLOCKING-2 required fixture architecture matching user directive ("keep same file architecture for /reports/runs/...")
- **Impact:** `dashboardData.json` references now resolve correctly; static serving architecture established

### Issue #2 Test Infrastructure (Neo)

**Issue:** https://github.com/diegoavalon/eVitals/issues/2  
**Status:** Approved  
**Owner:** Neo

**Decision:** Delivered reference test implementation covering four fetch states
- `vitest.config.ts` + `vitest.setup.ts` + 7 passing tests
- Hook: `app/lib/useDashboardData.ts`
- Types: `app/lib/dashboard.types.ts` (`DashboardData`, `FetchState<T>`, `PageEntry`, `DeviceResult`)
- Seed: `public/data/dashboardData.json`

**Rationale:** Tests are the acceptance criteria; Trinity may replace/relocate implementation but must keep four-state coverage

**Consequences:**
- Baseline `npm test` 7/7 passing
- Trinity builds Home component to render all four states as visually distinguishable UI
- Non-blocking follow-up issues can add UI-level RTL tests and cover malformed-JSON edge cases

### Issue #3: Config Validation Two-Layer Architecture (Trinity)

**Issue:** https://github.com/diegoavalon/eVitals/issues/3  
**Status:** Approved (post-blocker-fix)  
**Owner:** Trinity  
**Reviewer:** Neo

**Decision:** Implement config validation as two distinct layers with clear ownership:

#### Layer 1 — Raw Zod Schemas (`app/lib/config.schemas.ts`)
- Uses `.strict()` mode: unknown keys are flagged as errors
- No defaults: all fields must be explicitly provided (runner/pipeline use case)
- Includes cross-field validation: `defaultCategory` must appear in `enabledCategories`
- Returns raw Zod `SafeParseReturn` — consumers get full `ZodError` for introspection
- Tested by `app/__tests__/config.validation.test.ts` (48 contract tests)

#### Layer 2 — Consumer API (`app/lib/config/schemas.ts`)
- Uses `.strip()` mode: unknown keys silently removed
- Applies sensible defaults: `historyLimit=30`, `basePath="/eVitals/"`
- Enforces cross-field rule via `superRefine`: `defaultCategory ∈ enabledCategories`
- Returns clean discriminated union `ParseResult<T>` with field-dot-path errors
- Integrated into `useDashboardConfig` hook for app bootstrap
- Tested by `app/__tests__/config/dashboardConfig.test.ts` (34 consumer tests + 1 cross-field test)

**Rationale:** Runner scripts (Tank's domain) need strict validation to catch every misconfigured field and fail loudly. App bootstrap and downstream consumers benefit from defaults and a clean API that hides Zod internals. Both layers enforce the same correctness invariant: `defaultCategory ∈ enabledCategories`.

**Consequences:**
- Downstream consumers import from `~/lib/config` (Layer 2)
- Runner scripts can use either layer; raw layer more suitable for CI validation
- `dashboard.config.json` fixtures in both root and `public/data/` for app serving
- Issue #4 (Tank, data generation) reads from root `dashboard.config.json` using Layer 1 `config.schemas.ts`
- Config state machine in `App.tsx`: loading → error → ready before routes render

### Issue #3 Test Infrastructure (Neo)

**Issue:** https://github.com/diegoavalon/eVitals/issues/3  
**Status:** Approved  
**Owner:** Neo

**Decision:** Delivered comprehensive test coverage across both config validation layers

**Tests Delivered:**
- Layer 1: `app/__tests__/config.validation.test.ts` — 48 contract tests
  - Page registry schema: id/label/url/group required, URL validation, duplicate detection, unknown field rejection
  - Dashboard config schema: all fields validated, cross-field rule enforced, enum validation, array constraints
- Layer 2: `app/__tests__/config/dashboardConfig.test.ts` — 34 consumer API tests + 1 cross-field test
  - Defaults applied correctly
  - Error structure with field paths and messages
  - Cross-field rule: `defaultCategory ∉ enabledCategories` produces error

**Test Artifacts:**
- `dashboard.config.json` — canonical fixture (passes both layer validations)
- `urls.config.json` (pre-existing) — verified parsing under both layers
- Public sync: `public/data/dashboard.config.json` for app serving

**Rationale:** Tests are the acceptance criteria. Trinity layer implementations must satisfy all 90 tests (48 contract + 34 consumer + 7 pre-existing useDashboardData). Cross-field rule validation is a BLOCKING gate criterion.

**Consequences:**
- Baseline `npm test` 90/90 passing
- Both config layers enforced at runtime
- UI cannot render with internally inconsistent config (e.g., disabled default category)
- Non-blocking follow-up can add error recovery UI and config file location hinting

### Issue #6: Home Dashboard Implementation (Trinity)

**Issue:** https://github.com/diegoavalon/eVitals/issues/6  
**Status:** Approved  
**Owner:** Trinity  
**Reviewer:** Neo

**Decision:** Implement complete Home view dashboard with interactive device/category selectors driving all summary displays.

#### Architecture Choices

1. **Local State Management** — `useState` hooks for `selectedDevice` and `selectedCategory`, initialized from config defaults
   - Rationale: Device/category selection is local UI interaction with no server side effects
   - Impact: Controls respond immediately; stateless rendering per selection

2. **Section Composition Over Monolithic Render** — Break Home into functional sub-components: `SummaryCard`, `StatusCountCard`, `PrioritySection`, `RecentReportsSection`, `StatusBadge`
   - Rationale: Keeps each concern isolated and testable; mutable closure state passed to each sub-component
   - Impact: Shallow component tree; easier reasoning about data flow; testable sub-components

3. **Render-Time Filtering + Pre-Computed Aggregates** — Use `useMemo` for client-side filtering/sorting, but rely on pre-computed `aggregates` from dashboard data
   - Rationale: Dashboard data already includes aggregates per device/category; sorting/filtering page lists is cheap client-side
   - Impact: No duplicate computation; dashboard data contract is source of truth; stateless reactive UI

4. **Priority + Recent Reports Both Visible** — Render both "Needs Attention First" and "Most Recent Run" sections simultaneously
   - Rationale: Issue spec calls for both sections serving different use cases (urgent action vs. full overview)
   - Impact: Page names may appear in both sections; acceptable pattern for static dashboard

5. **Design Token Class Names, Not Inline Styles** — Apply all visual styling via Tailwind classes and design-system token names
   - Rationale: Aligns with DESIGN.md contract and CSS variable system; light/dark theme handled by CSS variables
   - Impact: Single source of truth for colors/fonts; theme toggle swaps variable values; no conditional styling in JSX

6. **Branded `/ui` Components for Controls** — Use `EhiSelect` for device/category dropdowns, `EhiButton` for action buttons, `EhiDrawer` for report iframe modal
   - Rationale: Brand consistency; `/ui` wraps `@base-ui` with design tokens; reduces custom UI surface area
   - Impact: Accessible out-of-the-box with ARIA attributes; drawer animation and backdrop handled by EhiDrawer

#### Test Compatibility

**Contract Test:** `home.generated-contract.test.tsx` uses 2-page fixture data with dashboard generation. Page names appear in both Priority and Recent Reports sections.
- Old test pattern: `screen.getByText("Medicare...")` → fails (multiple matches)
- Updated pattern: `screen.getAllByText("Medicare...")` → passes
- Rationale: Both sections independently render matching pages; test verifies presence, not uniqueness; user sees duplicates with clear section headers

#### Acceptance Criteria Fulfillment

- ✅ Device selector (mobile/desktop) updates all score, status, and priority elements
- ✅ Category selector (Performance, Accessibility, Best Practices, SEO) updates relevant displays
- ✅ Overall score, status counts, priority page list derived from generated dashboard data
- ✅ Most-recent reports section lists latest run entries with page name, score, status badge
- ✅ All Home elements render correctly in both light and dark theme (CSS variables)
- ✅ Component tests cover device/category control interactions and data-driven states
- ✅ `npm test` passes (343/343 tests); `npm run typecheck` clean; no TypeScript errors

#### Files Changed

- `app/routes/home.tsx` — Complete Home component with all sections
- `app/__tests__/dashboard/home.generated-contract.test.tsx` — Updated to use `getAllByText()`
- `.squad/agents/trinity/history.md` — Added learnings and checklist

**Consequences:**
- Home dashboard fully functional with responsive device/category selection
- All summary displays data-driven from generated dashboard aggregates
- Report drawer provides iframe-based report viewing with modal backdrop
- Component pattern available for issue #7 (All Pages view)
- CI green: 343/343 tests, clean TypeScript

### Issue #4: Lighthouse Parsing + Status Classification QA (Neo)

**Issue:** https://github.com/diegoavalon/eVitals/issues/4  
**Status:** Gate criteria defined, tests implemented and passing  
**Owner:** Neo  
**Date:** 2026-06-03

**Decision:** Delivered comprehensive test coverage and typed result model for Lighthouse report parsing and status classification.

#### QA Assets Delivered

| File | Purpose |
|---|---|
| `app/lib/lighthouse/types.ts` | Canonical typed result model: `LighthouseRunResult`, `LighthouseMetrics`, `LighthouseMetricStatuses`, `MetricStatus`, `ParseReportOptions`, `LighthouseCategoryScores`, `LighthouseCategoryStatuses` |
| `app/__tests__/lighthouse/classifyStatus.test.ts` | 44 boundary tests: LCP/CLS/TBT/categoryScore thresholds (at/below/above) + null → run-failed + worstStatus logic |
| `app/__tests__/lighthouse/parseReport.test.ts` | 46 fixture-driven + degraded-value contract tests using real fixture |

**Trinity's parallel implementation:** `thresholds.ts`, `parser.ts`, `index.ts`, `parser.test.ts` (81 tests)

**Total baseline:** 90 → **New total: 261/261** ✅ (90 pre-existing + 81 Trinity + 44 Neo classify + 46 Neo parse)

#### BLOCKING Gate Criteria

- [x] **GATE-1**: `npm test` 261/261 ✅
- [x] **GATE-2**: `npm run typecheck` clean ✅
- [x] **GATE-3**: `LighthouseRunResult` exported from `~/lib/lighthouse` as stable interface for issue #5
- [x] **GATE-4**: Performance status = worst-of CWV (not score band) — tested and correct ✅
- [x] **GATE-5**: `null` semantics for missing data (not `0`) — run-failed propagates correctly ✅

#### Non-blocking Observations

1. **Status naming diverges from PRD**: PRD says `"good"` / `"failing"`, Trinity uses `"pass"` / `"fail"`. Issue #5 generator should map to PRD labels or PRD updated.
2. **Category scores are raw 0.0-1.0**: PRD implies 0-100 display. Generator (issue #5) must multiply × 100.
3. **`pageId`, `label`, `group` not in ParseReportOptions**: Expected in manifest/result model. Data generator must attach from `urls.config.json` after parsing.
4. **`enabledCategories` in opts**: Correct design — parser only processes configured categories.

### Issue #4: Lighthouse Parsing + Status Classification (Trinity)

**Issue:** https://github.com/diegoavalon/eVitals/issues/4  
**Status:** Approved  
**Owner:** Trinity  
**Date:** 2026-06-02

**Decision:** MetricStatus naming and data model for Lighthouse result classification.

#### Design Decisions

- **D1:** `MetricStatus = "pass" | "needs-improvement" | "fail" | "run-failed"` (decoupled from dashboard `PageStatus`)
- **D2:** Category scores stored as 0–1 decimals (raw Lighthouse values); 0-100 conversion in UI layer
- **D3:** Metrics nullable; null means run-failed for that metric (not 0)
- **D4:** Performance category status derived from metric worst-of, not score band
- **D5:** `worstOf([])` returns "run-failed"
- **D6:** `ParseReportOptions` excludes page metadata (`pageId`, `label`, `group`); `device` extracted from report JSON
- **D7:** Backward-compat alias layer via `thresholds.ts` for legacy naming

#### Acceptance Criteria Fulfillment

- ✅ Parser accepts raw LH JSON and returns typed per-page/device result
- ✅ All Core Web Vitals and category scores extracted correctly
- ✅ Status assigned based on thresholds (boundary tests verify)
- ✅ Missing/malformed fields handled without throwing
- ✅ `npm test` passes (261/261); `npm run typecheck` clean

**Consequences:**
- Baseline parser behavior codified and tested
- Dashboard data generator (issue #5) bridges `LighthouseRunResult` to `DeviceResult` display model
- Non-blocking: PRD label reconciliation required in issue #5

### Issue #2: Add Lighthouse CLI as devDependency (Switch)

**Issue:** https://github.com/diegoavalon/eVitals/issues/11  
**Status:** Implemented  
**Owner:** Switch  
**Date:** 2026-06-03

**Decision:** Add Lighthouse CLI to devDependencies to enable GitHub Actions workflow to execute Lighthouse audits.

#### Problem

Workflow calls `pnpm exec tsx app/lighthouse.runner.ts` but Lighthouse CLI was not installed. Runner attempts to resolve CLI at `node_modules/.bin/lighthouse`, binary doesn't exist, audit execution fails silently.

#### Solution

Added `lighthouse@^12.3.0` to `package.json` devDependencies. CLI now available after `pnpm install` in workflow.

#### Artifact Flow Verification

1. **Runner Stage** — Executes Lighthouse audits → `public/reports/runs/{runId}/*.{json,html}` + `public/data/runs/{runId}/manifest.json`
2. **Generator Stage** — Aggregates results → `public/data/dashboardData.json`
3. **Merge Stage** — Layers React app → `public/index.html`, `public/assets/`
4. **Publish Stage** — Deploy to gh-pages → includes reports, data, React assets

**Result:** Browser loads React app from `https://diegoavalon.github.io/eVitals/`, fetches `{BASE_URL}data/dashboardData.json`, renders live Lighthouse data with report links.

#### Testing

- All 419 tests pass
- `pnpm exec which lighthouse` → `./node_modules/.bin/lighthouse` ✅

**Consequences:**
- Workflow can execute Lighthouse audits successfully
- Reports and dashboard data published to gh-pages
- Dashboard displays real audit results

### Issue #5: Dashboard Generator (Tank)

**Issue:** https://github.com/diegoavalon/eVitals/issues/5  
**Status:** Implemented  
**Owner:** Tank  
**Date:** 2026-06-03

**Decision:** Dashboard generator must not hide Lighthouse failures; include failed runs in generated dashboardData.

#### Problem Statement

Published Pages dashboard showed no metrics despite successful workflow runs. Root cause: generator skipping all "run-failed" entries from manifests, resulting in empty dashboard data visible to users.

#### Solution

Modified `generateDashboardArtifacts.cli.ts` to include failed runs in `dashboardData.json` rather than filtering:

```typescript
// Before: skipped failed runs, resulted in empty dashboard
if (entry.status === "run-failed") continue;

// After: includes failed runs, shows failures to user
if (entry.status === "run-failed") {
  parsedResults.push({
    pageId: entry.pageId,
    result: parseLighthouseReport(null, {...}),
  });
  continue;
}
```

#### Rationale

1. **Transparency:** Users/operators see when audits fail; hiding masks operational problems
2. **Tank's Charter:** Preserve partial run data and failed task details **without hiding failures**
3. **Diagnosis:** Failed entries enable teams to see failure patterns
4. **Parseable Default:** `parseLighthouseReport(null, ...)` safely returns failed status with null metrics

#### Testing

- All 419 existing tests pass (backward-compatible)
- Successful runs continue parsing from JSON files
- Failed runs populate dashboard via null-parsed results
- Dashboard always shows data for every page/device pair, even on failure runs

**Consequences:**
- Dashboard shows "run-failed" status (red) vs empty placeholder
- Failed audits visible in dashboard instead of disappearing
- Generator no longer silently drops 100% of run results on failure

#### Follow-Up

Secondary issue remains: diagnose why all Lighthouse audits fail on GitHub Actions runner. Now visible in dashboard.

### Issue #11 (Part 3): Fix Lighthouse Metrics Rendering on GitHub Pages (Trinity)

**Issue:** https://github.com/diegoavalon/eVitals/issues/11  
**Status:** Implemented  
**Owner:** Trinity  
**Date:** 2026-06-03

**Decision:** Fix GitHub Pages deployment rendering by resolving manifest schema mismatch and run ID detection logic failure.

#### Problem Statement

GitHub Action successfully deployed dashboard to GitHub Pages, but page rendered with no Lighthouse metrics. All pages showed "run-failed" status; no actual metrics or reports visible.

#### Root Causes

1. **Manifest Schema Mismatch (Primary)**
   - Wrong: `entries: [...]` array
   - Expected: `results: [...]` array per `RunManifest` type
   - Missing: Top-level `statusCounts` and `fetchTime` fields
   - Impact: `for (const entry of manifest.results)` iterated over undefined

2. **Run ID Detection Logic Failure (Secondary)**
   ```typescript
   // Before (broken):
   if (runId > latestRunId!) { latestRunId = runId; }
   // In JavaScript: "2026-06-02T14-00-00Z" > null === false ❌
   ```
   - Comparison always false; `latestRunId` never set; reports skipped

3. **Custom Run ID Date Format**
   - Format: "2026-06-02T14-00-00Z" (hyphens instead of colons)
   - `new Date("2026-06-02T14-00-00Z").getTime()` → NaN ❌
   - `new Date("2026-06-02T14:00:00Z").getTime()` → valid ✓

#### Solution

1. **Fixed Fixture Manifest Schema**
   - Changed `entries: [...]` to `results: [...]`
   - Added `statusCounts` and `fetchTime` fields

2. **Fixed Run ID Detection Logic**
   ```typescript
   // After (fixed):
   if (latestRunId === null || runId > latestRunId) {
     latestRunId = runId;
     latestRunTimestamp = new Date(runId.replace(/-/g, ":")).getTime();
   }
   ```
   - Explicit null check
   - Custom run ID format parsing (replace hyphens with colons)

#### Verification

- ✅ Dashboard generates with correct `runId: "2026-06-02T14-00-00Z"`
- ✅ `latestRunResultCount: 1` (was 0)
- ✅ Status counts correctly show 1 "failing", 19 "run-failed"
- ✅ All 419 tests pass
- ✅ `npm run build` succeeds
- ✅ Generated `dashboardData.json` contains valid Lighthouse metrics

**Consequences:**
- Dashboard correctly renders metrics on GitHub Pages deployment
- Both local testing and deployed pages show Lighthouse metrics
- Fixture data matches `RunManifest` type contract
- Run ID detection robust to null checks and custom date format

#### Notes for Future Work

1. Consolidate manifest JSON parsing into reusable parser module
2. Document custom run ID format ("YYYY-MM-DDTHH-MM-SSZ") in code comments
3. Add manifest schema validation tests to CI pipeline
4. Consider TypeScript strict mode to catch null comparison bugs at compile time

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
