# Trinity History

## Core Context

- **Project:** eVitals
- **Primary user:** Diego Avalon
- **Description:** Static GitHub Pages dashboard for daily Lighthouse/Core Web Vitals reporting across configured eHealth pages.
- **Stack:** npm, Vite, React, TypeScript, Tailwind CSS, design-system CSS variables, branded `/ui` components, Vitest, React Testing Library, Node/TypeScript runner scripts, Lighthouse CLI, GitHub Actions, gh-pages.

## Learnings

- Initial UI guidance comes from `app/docs/00_Initial.md`: follow root `DESIGN.md`, use branded `/ui` components before direct `@base/ui`, and match `index-mockup.jpg` only where it does not conflict with `DESIGN.md`.
- Trinity is assigned to issues: #2 (walking skeleton), #3 (config), #6 (Home), #7 (All Pages), #8 (report drawer)

### Issue #2 — Walking Skeleton (2026-06-02)

- The starter used React Router v7 "framework mode" (SSR). Converting to a static SPA means: remove `@react-router/dev` plugin, use `@vitejs/plugin-react`, keep `react-router` for `HashRouter`/`Routes`/`Route`, and add `index.html` + `app/main.tsx` as the Vite entry.
- Import `defineConfig` from `vitest/config` (not `vite`) to get TypeScript support for the `test` config block in `vite.config.ts`.
- `BASE_URL` in `import.meta.env` is set by Vite to the configured `base` option (e.g. `/eVitals/`). In Vitest it defaults to `/`. Use it for data fetch URLs to ensure correct paths under all environments.
- All `/ui` component imports for `cn` resolve to `app/components/utils/cn.ts` (path `../../utils/cn` from `app/components/ui/EhiXxx/index.tsx`).
- `@base-ui/react/button` allows `className` to be a function `(state: ButtonState) => string`. EhiButton should narrow it to `string` via `Omit<..., "className"> & { className?: string }`.
- The project already had `useDashboardData.ts`, `dashboard.types.ts`, `public/data/dashboardData.json`, and `app/__tests__/useDashboardData.test.tsx` authored before issue #2 implementation started. The four fetch-state tests (loading, missing, invalid, success) already matched the hook's behavior.
- `npm test` and `npm run build` both pass after conversion. 7/7 tests pass.

