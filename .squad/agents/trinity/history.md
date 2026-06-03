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

## Learnings

### Hero Carousel Animation Implementation (2026-06-03)

**Pattern:** CSS-only entrance animation for hero carousel cards with accessibility support.

**Implementation:**
- Added `hero-card-animate` CSS class with keyframe animation in `app/app.css`
- Animation: subtle fade-in + translateY + scale (0.35s cubic-bezier easing)
- Added `@media (prefers-reduced-motion: reduce)` to disable animation for accessibility
- Used React key-based remounting strategy: `animKey` state increments on carousel navigation to trigger animation replay
- Applied `key={animKey}` to `AttentionCard` component to force remount on index change
- Updated navigation handlers (prev/next/dot) to increment `animKey` alongside `currentIndex`

**Key Files:**
- `app/app.css`: CSS animation definition with reduced-motion support
- `app/routes/home.tsx`: `AttentionCarousel` component with `animKey` state and key prop on `AttentionCard`

**Behavior:**
- Animation triggers when user clicks prev/next/dot navigation controls
- No animation on initial load (only on subsequent navigation)
- Card content remains stable (no data model or navigation behavior changes)
- Dot indicators retain existing smooth transition (no changes needed)

**Test Status:** 420/422 tests passing (2 pre-existing failures unrelated to animation work). Build clean.

### Hero Carousel Direction-Aware Animation (2026-06-03)

**Pattern:** CSS-first directional animations that match carousel navigation intent. Clicking Next animates the card from the right; clicking Previous animates from the left.

**Implementation:**
- Split single animation into two direction-specific keyframes in `app/app.css`:
  - `hero-card-enter-from-right`: fade + translateX(16px) for next/right navigation
  - `hero-card-enter-from-left`: fade + translateX(-16px) for prev/left navigation
- Added `direction` state to `AttentionCarousel` component (type: `"left" | "right"`)
- Updated navigation handlers:
  - Prev button: sets `direction="left"`
  - Next button: sets `direction="right"`
  - Dot navigation: sets direction based on comparison (`i > safeIndex ? "right" : "left"`)
- Passed `direction` prop to `AttentionCard` component
- Applied conditional CSS class based on direction prop: `hero-card-animate-from-right` or `hero-card-animate-from-left`
- Maintained `@media (prefers-reduced-motion: reduce)` for both animations

**Key Files:**
- `app/app.css`: Two directional keyframe animations with reduced-motion support
- `app/routes/home.tsx`: `AttentionCarousel` adds direction state; `AttentionCard` receives direction prop and applies conditional CSS class

**Behavior:**
- Subtle horizontal slide matches user's navigation intent
- No changes to carousel data flow, report drawer, or URL routing
- Animation triggers on prev/next/dot clicks (not initial load)
- Fully accessible: respects reduced-motion preference

**Test Status:** 15/15 priority-and-interaction tests passing. 1 pre-existing failure in device-selector tests unrelated to animation work. TypeScript build clean.

### Clickable Page URLs in Dashboard (2026-06-03)

**Pattern:** Display page URLs as clickable external links in both card and table row layouts with proper accessibility and visual hierarchy.

**Implementation:**
- Added clickable URL links to `AttentionCard` component (hero carousel priority cards):
  - Positioned between page label and group metadata
  - Uses `text-primary` for brand color consistency
  - Small text (11px) with hover underline
  - Opens in new tab with `target="_blank"` and `rel="noopener noreferrer"` for security
  - Stops propagation on click to prevent card interactions
- Added clickable URL links to `RecentReportRow` component (table rows):
  - Positioned between page label/device badge and group label
  - Same styling approach for consistency
  - Truncates long URLs with `truncate` class
- Both implementations preserve existing row/card interactions (drawer opening, report viewing)
- URLs are accessible with clear link semantics (`<a>` tags with proper ARIA)

**Key Files:**
- `app/routes/home.tsx`: Updated `AttentionCard` (lines 424-432) and `RecentReportRow` (lines 825-833) components

**Behavior:**
- Page URLs are now visible and clickable from both card (priority carousel) and table (recent reports) layouts
- Clicking URL opens page in new tab without disrupting dashboard navigation
- URL links maintain visual hierarchy (smaller/lighter than page labels)
- Preserves all existing interactions (report drawer, device/category filters)

**Test Status:** 72/73 tests passing. 1 pre-existing test failure unrelated to URL work (test expects "pages passing" text that doesn't exist in UI). TypeScript build clean.

