# Morpheus History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Recent Updates

📌 **2026-06-02:** PRD synthesis and publication complete
- Synthesized PRD from `app/docs/00_Initial.md`
- Published as GitHub issue #1: "PRD: eHealth Core Web Vitals Dashboard"
- Issue URL: https://github.com/diegoavalon/eVitals/issues/1
- Architectural decision: static GitHub Pages dashboard with deep module boundaries
- Team roster confirmed and ready for implementation

📌 **2026-06-02:** Issue slicing complete and published
- Drafted 10 tracer-bullet vertical slices from issue #1 PRD
- User approved decomposition; all issues published
- 10 child issues created (#2–#11) with dependency chains
- Squad labels applied: trinity, tank, switch, neo per scope
- Dependency lock: #11 blocked by #9, #10, #2

## Learnings

- **Issue #2 blocker revision (2026-06-02):** When Neo (reviewer) issues a CONDITIONAL REJECT with Trinity locked out, Morpheus assumes ownership as Lead. Two classes of blocker emerged: (1) design-system compliance — routes must render at least one `/ui` component (not hand-rolled HTML only); (2) fixture/data path alignment — `dashboardData.json` report paths must have matching physical files under `public/reports/runs/<runId>/` so the static app can serve them. Fix: import `EhiButton` (variant="link") as "View Report" anchor per page row; copy fixture HTMLs/JSONs into the correct `public/` subtree. No new design direction, no synthetic seed data added. Commit: `f8a939c`.

- Initial source of truth is `app/docs/00_Initial.md`, an implementation handoff for the eHealth Core Web Vitals Dashboard.
- Published PRD for the eHealth Core Web Vitals Dashboard as issue #1: https://github.com/diegoavalon/eVitals/issues/1. Key module boundaries: config validation, Lighthouse runner, Lighthouse parsing, status classification, dashboard data and manifest generation, retention pruning, static client data/selectors, Home and All Pages views, report drawer, and gh-pages workflow publishing.

- Drafted a tracer-bullet vertical-slice breakdown of issue #1 (PRD) for the coordinator to quiz the user. Proposed 10 slices: (1) static app walking skeleton, (2) config validation contracts, (3) Lighthouse parsing + status classification, (4) dashboard data + manifest generation, (5) Home dashboard, (6) All Pages table, (7) report drawer + nav/theme/run-check, (8) Lighthouse runner script, (9) retention pruning, (10) GitHub Actions gh-pages workflow (HITL). Not yet published as issues.

- Published 10 child implementation issues under parent #1. Dependency chain: #2 → #3 → #4 → #5 → #6 → #7 (UI track) and #5 → #9 → #10 (runner track) and #9 + #10 + #2 → #11 (CI track). Full map:
  - #2 https://github.com/diegoavalon/eVitals/issues/2 — Walking skeleton (no blockers)
  - #3 https://github.com/diegoavalon/eVitals/issues/3 — Config validation (blocked by #2)
  - #4 https://github.com/diegoavalon/eVitals/issues/4 — Lighthouse parsing (blocked by #3)
  - #5 https://github.com/diegoavalon/eVitals/issues/5 — Dashboard data generation (blocked by #4)
  - #6 https://github.com/diegoavalon/eVitals/issues/6 — Home dashboard (blocked by #5)
  - #7 https://github.com/diegoavalon/eVitals/issues/7 — All Pages table (blocked by #6)
  - #8 https://github.com/diegoavalon/eVitals/issues/8 — Report drawer + nav + theme (blocked by #7)
  - #9 https://github.com/diegoavalon/eVitals/issues/9 — Lighthouse runner script (blocked by #5)
  - #10 https://github.com/diegoavalon/eVitals/issues/10 — Retention pruning (blocked by #9)
  - #11 https://github.com/diegoavalon/eVitals/issues/11 — GitHub Actions workflow HITL (blocked by #9, #10, #2)
