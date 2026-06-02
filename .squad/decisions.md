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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
