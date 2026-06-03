# Tank History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial runner/data requirements come from `app/docs/00_Initial.md`: read `urls.json` and `dashboard.config.json`, run mobile and desktop Lighthouse tasks with concurrency 2, timeout after 5 minutes, retry once, preserve successful JSON/HTML reports, and record failed tasks in manifests.
- Tank is assigned to issues: #4 (parsing), #5 (dashboard data), #9 (runner script), #10 (pruning)
- Issue #5 generator layer now lives in `app/lib/dashboard.ts` with pure functions (`generateDashboardData`, `generateRunManifests`, `generateDashboardArtifacts`) that accept validated config + page registry + parsed results and return deterministic dashboard/manifest outputs.
- Dashboard contract expanded in `app/lib/dashboard.types.ts` to include generated `summary`, `aggregates` (`byCategory`/`byDevice`), `priority`, and `recentRunHistoryByPage`; `useDashboardData` now validates this richer shape before returning success.
- Fixture-driven contract tests at `app/__tests__/generation/generateDashboardArtifacts.contract.test.ts` and `app/__tests__/dashboard/home.generated-contract.test.tsx` verify mixed-status multi-page/multi-device generation, deterministic ordering, preserved `/reports/runs/{runId}/...` paths, and React compatibility.

### Published Pages Data Gap Root Cause (2026-06-03)

- **Issue**: Deployed GitHub Pages dashboard showed no Lighthouse metrics, only placeholders. No data in UI even though workflow ran successfully.
- **Root Cause**: Generator CLI (`app/lib/dashboard/generateDashboardArtifacts.cli.ts`) was skipping all "run-failed" entries from manifests, per lines 75-77. When all Lighthouse audits fail (returning "run-failed" status), `parsedResults` becomes empty, causing dashboard data to generate with empty `runId: ""` and all statuses as "run-failed" defaults.
- **Discovery Method**: Traced published dashboardData.json on live site vs. expected structure; compared manifest generation in workflow logs; identified generator's filtering logic as violation of Tank's responsibility to "preserve partial run data and failed task details without hiding failures."
- **Fix**: Modified `generateDashboardArtifacts.cli.ts` to include failed run results (`status === "run-failed"`) in parsedResults by calling `parseLighthouseReport(null, ...)`, which safely returns failed status with null metrics. Ensures failures are visible rather than hidden, allowing users and ops to see that audits failed vs. appearing to have no data.
- **Tests**: All 419 tests pass; typecheck clean. Change is backward-compatible: successful results parsed from JSON files continue to work; failed results now populate dashboard instead of disappearing.
- **Secondary Issue**: Why all Lighthouse audits are failing on GitHub Actions remains undiagnosed (likely CLI invocation, network, or Chrome issue), but now failures will be visible to the user instead of hidden by generator skip logic.

### Orchestration: GitHub Pages Deployment Fix Coordination (2026-06-03)

**Completion Date:** 2026-06-03T17:00:42Z

In parallel, Tank (generator failures visibility), Switch (Lighthouse CLI fix), and Trinity (manifest schema + run ID detection) completed investigations into why GitHub Pages deployment showed no metrics. Root causes identified and fixed:

1. **Tank's Fix:** Generator now preserves failed runs instead of filtering them → users see audit failures instead of empty dashboard
2. **Switch's Fix:** Lighthouse CLI dependency restored audit execution in workflow
3. **Trinity's Fix:** Manifest schema and run ID detection corrected → dashboard parsing works end-to-end

**Cross-Agent Context:** These three fixes complete the end-to-end Lighthouse data flow for issue #11 (GitHub Pages publication). All 419 tests passing. Orchestration logged to `.squad/orchestration-log/2026-06-03T17-00-42Z-{agent}.md` and session consolidated in `.squad/log/2026-06-03T17-00-42Z-pages-lighthouse-rendering.md`. Decisions merged to `.squad/decisions.md` (now 24.9 KB with 5 new entries).

**Artifact Flow Verification Complete:**
- ✅ Generator preserves all run status entries (pass, fail, run-failed)
- ✅ Failed runs populate dashboard via null-parsed results
- ✅ No silent drops; failures visible to user
- ✅ Backward-compatible with successful runs continuing to parse from JSON
- ✅ Published dashboard shows real audit failures instead of empty `runId: ""`
