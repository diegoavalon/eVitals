# GitHub Pages Asset Merge Without Nested Paths

## When to use
Use this pattern when a workflow restores an existing `gh-pages` directory and then merges fresh Vite/Webpack build output into it.

## Problem signature
- Workflow succeeds and deploys.
- Browser 404s on JS/CSS bundles.
- `index.html` points to `/repo-name/assets/*` but files are under `/assets/assets/*`.

## Root cause
Copying the directory (`cp -r dist/assets public/assets`) into an already existing `public/assets` directory creates a nested folder.

## Safe pattern
```bash
rm -rf public/assets
mkdir -p public/assets
cp -r dist/assets/. public/assets/
```

## Base path guard
Ensure build base path matches project-site root:
```bash
VITE_BASE_PATH=/${REPO_NAME}/ npm run build
```
(or equivalent CI env injection).

## Verification checklist
- `public/index.html` references `/repo-name/assets/*.js|css`.
- Each referenced asset exists in `public/assets/`.
- No `public/assets/assets/` directory is present.
