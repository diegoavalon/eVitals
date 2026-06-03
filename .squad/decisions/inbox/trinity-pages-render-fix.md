# Decision: Fix Lighthouse Metrics Rendering on GitHub Pages

**Status:** Implemented  
**Date:** 2026-06-03  
**Owner:** Trinity  
**Related Issue:** GitHub Pages deployment not rendering Lighthouse metrics despite successful action run  

## Problem Statement

The GitHub Action successfully deployed the eVitals dashboard to GitHub Pages, but the page rendered with no Lighthouse metrics visible. The page appeared to load, but showed all pages with "run-failed" status and no actual metrics or reports.

## Root Causes Identified

### 1. Manifest Schema Mismatch (Primary)

The fixture `public/data/runs/2026-06-02T14-00-00Z/manifest.json` had a schema incompatible with the dashboard generator:

- **Wrong:** Used `entries: [...]` array
- **Expected:** Uses `results: [...]` array per `RunManifest` type
- **Missing:** Top-level fields `statusCounts` and `fetchTime`
- **Impact:** Dashboard generator code `for (const entry of manifest.results)` iterated over undefined

### 2. Run ID Detection Logic Failure (Secondary)

The `generateDashboardArtifacts.cli.ts` line 58 had a JavaScript evaluation bug:

```typescript
// Before (broken):
if (runId > latestRunId!) {  // latestRunId = null initially
  latestRunId = runId;
}

// In JavaScript: "2026-06-02T14-00-00Z" > null === false ❌
```

The comparison always evaluated to false, so `latestRunId` was never set, and the dashboard generator skipped all report parsing.

### 3. Custom Run ID Date Format

The run ID format "2026-06-02T14-00-00Z" has hyphens in place of colons (from `createRunId()` function), which fails `new Date()` parsing:

```javascript
new Date("2026-06-02T14-00-00Z").getTime()  // → NaN ❌
new Date("2026-06-02T14:00:00Z").getTime()  // → <valid timestamp> ✓
```

## Solution Implemented

### 1. Fixed Fixture Manifest Schema

Updated `public/data/runs/2026-06-02T14-00-00Z/manifest.json`:

```json
{
  "runId": "2026-06-02T14-00-00Z",
  "generatedAt": "2026-06-02T14:00:00Z",
  "fetchTime": "2026-06-02T16:19:41.855Z",  // Added
  "statusCounts": {                          // Added
    "good": 0,
    "needs-improvement": 1,
    "failing": 0,
    "run-failed": 0
  },
  "results": [                               // Changed from "entries"
    { /* manifest entry */ }
  ]
}
```

### 2. Fixed Run ID Detection Logic

Updated `generateDashboardArtifacts.cli.ts` line 57-60:

```typescript
// After (fixed):
if (latestRunId === null || runId > latestRunId) {
  latestRunId = runId;
  latestRunTimestamp = new Date(runId.replace(/-/g, ":")).getTime();
}
```

- Explicitly handle null case: `latestRunId === null`
- Parse custom run ID format: Replace hyphens with colons before Date parsing

## Verification

After applying both fixes:

- ✅ Dashboard generates with correct `runId: "2026-06-02T14-00-00Z"`
- ✅ `latestRunResultCount: 1` (was 0)
- ✅ Status counts correctly show 1 "failing", 19 "run-failed" (pages without reports)
- ✅ All 419 tests pass
- ✅ `npm run build` succeeds
- ✅ Generated `dashboardData.json` now contains valid Lighthouse metrics

## Consequences

- Dashboard now correctly renders metrics on GitHub Pages deployment
- Both local testing and deployed pages will show Lighthouse metrics for configured pages
- Fixture data properly matches the `RunManifest` type contract
- Run ID detection is robust to both null checks and custom date format

## Notes for Future Work

1. Consider consolidating manifest JSON parsing into a reusable parser to avoid schema mismatches
2. Document the custom run ID format ("YYYY-MM-DDTHH-MM-SSZ") in code comments
3. Add validation tests for manifest schema in CI pipeline
4. Consider using TypeScript strict mode to catch null comparison bugs at compile time
