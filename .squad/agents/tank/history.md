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
