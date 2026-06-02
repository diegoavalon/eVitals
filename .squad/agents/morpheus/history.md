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

## Learnings

- Initial source of truth is `app/docs/00_Initial.md`, an implementation handoff for the eHealth Core Web Vitals Dashboard.
- Published PRD for the eHealth Core Web Vitals Dashboard as issue #1: https://github.com/diegoavalon/eVitals/issues/1. Key module boundaries: config validation, Lighthouse runner, Lighthouse parsing, status classification, dashboard data and manifest generation, retention pruning, static client data/selectors, Home and All Pages views, report drawer, and gh-pages workflow publishing.
