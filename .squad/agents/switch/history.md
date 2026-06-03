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
