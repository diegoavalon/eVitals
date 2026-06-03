# SKILL: Base-Path URL Resolution for Static Dashboards

## Use when

- App is deployed to GitHub Pages project path (e.g. `/repo-name/`)
- UI must work in both local dev (`/`) and production project base
- URLs are composed for static JSON, reports, or other frontend assets

## Pattern

1. Create one helper to join `import.meta.env.BASE_URL` and relative paths.
2. Normalize base path once (leading slash + trailing slash, or `./` support).
3. Strip leading slashes from input paths before joining.
4. Preserve absolute URLs unchanged.
5. Route all fetch/report links through the helper.

## Validation checklist

- `npm run test` includes helper tests for `/`, `/repo/`, `/repo`, and `./`
- `npm run build` output `dist/index.html` references expected base-prefixed assets
- Deployed page can load CSS/JS and `data/*.json` under project base
