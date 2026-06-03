# Switch History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial workflow requirements come from `app/docs/00_Initial.md`: run daily at `0 14 * * *`, support `workflow_dispatch`, build/test before publishing, use `ubuntu-latest`, verify Chrome/Chromium, set `CHROME_PATH`, and publish static artifacts to `gh-pages`.
- Switch is assigned to issue #11: GitHub Actions workflow (HITL, blocked by #9, #10, #2).
- **Issue #10 (prune.ts):** Artifact collection must handle both tracked paths (in dashboard data) and discovered files (on filesystem). Test fixtures may only track artifacts for the current run but create files for all historical runs. Solution: Added `discoverArtifactsFromFilesystem()` to scan runId directories and collect untracked files before deletion (commit 15f7ead). All 16 prune tests pass.
- **Issue #11 (lighthouse-publish.yml):** Created production-ready workflow with all 6 pipeline stages (Setup, Gate, Verify, Execute, Generate & Prune, Publish). Implemented comprehensive error handling per Morpheus spec: infrastructure failures abort (exit 1); page/device failures continue with partial data (exit 0 if manifest exists). Added CLI entry points for generateDashboardArtifacts.cli.ts and prune.cli.ts. All 28 workflow integration tests pass.
- **Lighthouse Dependency Fix:** Diego reported that gh-pages deployment succeeds but shows no reports. Root cause: Lighthouse CLI was not in package.json devDependencies. The runner code resolves to `node_modules/.bin/lighthouse` when `LIGHTHOUSE_CLI_PATH` env is not set, but the binary didn't exist. Fix: Added `lighthouse@^12.3.0` to devDependencies. Workflow now has Lighthouse available for audits. All 419 tests pass; build succeeds. Verified artifact flow: runner → `public/reports/` and `public/data/runs/`, generator → `public/data/dashboardData.json`, React merge → `public/index.html` and `public/assets/`, upload → entire `public/` to gh-pages.
- **GitHub Pages Asset 404 Fix:** Reproduced broken deployment pathing despite successful workflow by simulating merge step with existing `public/assets` from restored `gh-pages`. Root cause: `cp -r dist/assets public/assets` nests files into `public/assets/assets`, while `index.html` points at `/eVitals/assets/*` (404). Fix in workflow: set `VITE_BASE_PATH` from repository name at build time and replace assets via `rm -rf public/assets && mkdir -p public/assets && cp -r dist/assets/. public/assets/`. Verified referenced bundles exist and all 419 tests + build pass.

### Orchestration: GitHub Pages Deployment Fix Coordination (2026-06-03)

**Completion Date:** 2026-06-03T17:00:42Z

In parallel, Switch (Lighthouse CLI fix), Tank (generator failures visibility), and Trinity (manifest schema + run ID detection) completed investigations into why GitHub Pages deployment showed no metrics. Root causes identified and fixed:

1. **Switch's Fix:** Lighthouse CLI dependency restored audit execution in workflow
2. **Tank's Fix:** Generator now preserves failed runs instead of hiding them → users see audit failures
3. **Trinity's Fix:** Manifest schema and run ID detection corrected → dashboard parsing works end-to-end

**Cross-Agent Context:** These three fixes complete the end-to-end Lighthouse data flow for issue #11 (GitHub Pages publication). All 419 tests passing. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-00-42Z-{agent}.md` and session consolidated in `.squad/log/2026-06-03T17-00-42Z-pages-lighthouse-rendering.md`. Decisions merged to `.squad/decisions.md` (now 24.9 KB with 5 new entries).

**Artifact Flow Verification Complete:**
- ✅ Lighthouse CLI available
- ✅ Audits execute successfully
- ✅ Reports generated to `public/reports/runs/{runId}/`
- ✅ Manifests generated to `public/data/runs/{runId}/manifest.json`
- ✅ Generator aggregates results → `public/data/dashboardData.json`
- ✅ Dashboard parsing correct (null checks, schema compliance)
- ✅ Published page renders Lighthouse metrics live

### Orchestration: Static Assets 404 Fix (2026-06-03)

**Completion Date:** 2026-06-03T17:42:23Z

Follow-up coordination between Switch and Trinity to resolve remaining asset and URL issues on GitHub Pages deployment:

1. **Switch's Asset Path Fix:** Diagnosed and fixed asset nesting during workflow merge step. Solution: atomic `public/assets` replacement (`rm -rf` + copy) + `VITE_BASE_PATH` env setup. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-42-23Z-switch-pages-assets-audit.md`.

2. **Trinity's Base-Path Resolution Fix:** Created `withBasePath` utility for centralized frontend URL resolution across environments (local dev `/`, GitHub Pages `/eVitals/`, custom bases). Updated all static JSON fetches and report iframe links. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-42-23Z-trinity-pages-assets-fix.md`.

**Session Consolidated:** `.squad/log/2026-06-03T17-42-23Z-pages-static-assets-not-found.md`

**Decisions Recorded:**
- "GitHub Pages Assets Path Integrity" (Switch)
- "Normalize Frontend Base-Path URL Resolution" (Trinity)

**Impact:** Combined fixes ensure deterministic asset layout + consistent URL resolution across all deployment environments. All 419 tests passing. No further 404 errors for assets, data, or reports.
