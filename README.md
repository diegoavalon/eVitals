# eVitals — Lighthouse Dashboard

A Lighthouse performance dashboard for [ehealthinsurance.com](https://www.ehealthinsurance.com/). Audits run on a daily schedule via GitHub Actions and publish to GitHub Pages.

**Live dashboard:** https://diegoavalon.github.io/eVitals/

---

## Prerequisites

- [Node.js](https://nodejs.org/) v24+
- [pnpm](https://pnpm.io/) v10+
- Chrome or Chromium (required to run Lighthouse audits)

---

## Setup

```bash
pnpm install
```

---

## Development

Start the dev server against whatever data is already in `public/`:

```bash
pnpm run dev
```

The app will be available at `http://localhost:5173`. No Lighthouse run is needed — existing `public/data/dashboardData.json` is served as-is.

---

## Running the full pipeline locally

The pipeline mirrors what the GitHub Actions workflow does. Run each step from the project root.

### 1 — Run Lighthouse audits

Audits every URL in `urls.config.json` for each device in `dashboard.config.json` and writes raw reports to `public/`.

```bash
pnpm exec tsx app/lighthouse.runner.ts
```

#### Environment variables

| Variable | Default | Description |
|---|---|---|
| `LIGHTHOUSE_RUN_ID` | Current timestamp | ID for this run (e.g. `2026-06-03T14-00-00Z`) |
| `LIGHTHOUSE_OUTPUT_ROOT` | `public/` | Directory where reports and run data are written |
| `LIGHTHOUSE_CONCURRENCY` | `2` | Number of parallel audits |
| `LIGHTHOUSE_TIMEOUT_MS` | `300000` | Per-audit timeout in milliseconds |
| `LIGHTHOUSE_RETRY_COUNT` | `1` | Retries per failing audit |
| `LIGHTHOUSE_CLI_PATH` | _(auto-detected)_ | Path to a specific Chrome/Chromium executable |

Example — run a single fast audit with a fixed ID:

```bash
LIGHTHOUSE_CONCURRENCY=1 LIGHTHOUSE_RUN_ID=local-test pnpm exec tsx app/lighthouse.runner.ts
```

### 2 — Generate dashboard data

Reads all run manifests from `public/data/runs/`, parses the Lighthouse reports from the latest run, and writes `public/data/dashboardData.json`.

```bash
pnpm exec tsx app/lib/dashboard/generateDashboardArtifacts.cli.ts
```

### 3 — Prune old runs (optional)

Removes the oldest run directories from `public/data/runs/`, retaining the most recent N runs.

```bash
pnpm exec tsx app/lib/retention/prune.cli.ts --limit 30
```

### 4 — Build the React app

Compiles and bundles the dashboard UI into `dist/`. To match the deployed sub-path:

```bash
VITE_BASE_PATH=/eVitals/ pnpm run build
```

Omit `VITE_BASE_PATH` when serving from the root of a local server.

### 5 — Preview the built output

Copy the built app into `public/` and preview the full static site:

```bash
cp dist/index.html public/index.html
cp -r dist/assets public/assets
npx serve public
```

Or simply run the dev server (step above) after generating dashboard data — the dev server reads `public/data/dashboardData.json` directly.

---

## Configuration

### `urls.config.json`

Defines the pages to audit. Each entry requires:

| Field | Description |
|---|---|
| `id` | Unique slug used as the report filename |
| `label` | Human-readable page name shown in the dashboard |
| `url` | Full URL to audit |
| `group` | Category grouping (e.g. `core`, `medicare`, `resources-ifp`) |

### `dashboard.config.json`

| Field | Description |
|---|---|
| `defaultCategory` | Which Lighthouse category is shown by default |
| `enabledCategories` | Categories to audit and display |
| `devices` | Devices to audit (`mobile`, `desktop`) |
| `historyLimit` | Number of historical runs retained |
| `basePath` | URL base path for the deployed site |

---

## CI / CD

The GitHub Actions workflow (`.github/workflows/lighthouse-publish.yml`) runs daily at 06:00 UTC and on manual dispatch. It runs the full pipeline above and publishes to GitHub Pages via the Actions artifact upload mechanism.

To trigger a run manually:

```bash
gh workflow run lighthouse-publish.yml
```

---

## Other commands

```bash
pnpm run typecheck   # TypeScript type check
pnpm run test        # Run test suite
pnpm run test:watch  # Watch mode
```
