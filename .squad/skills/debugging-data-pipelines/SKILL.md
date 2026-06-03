# Debugging Data Generation Pipelines

**Skill:** Systematic approach to diagnosing data generation failures in multi-stage pipelines.

## Problem Pattern

Output stage renders with empty or placeholder data despite upstream data generation completing successfully. Common causes include:

1. **Schema/Contract Mismatch** - Data structure doesn't match expected type
2. **Silent Failures** - Exception caught but logged as warning, execution continues
3. **Early Exit Conditions** - Guard clauses with null/falsy checks prevent downstream processing
4. **Custom Format Parsing** - Non-standard date/time formats fail standard library parsing

## Diagnostic Approach

### 1. Identify the Data Flow Stages

Map stages from input → processing → output:

```
Input Data
  ↓
[Stage 1: Load/Parse] → Manifest JSON
  ↓
[Stage 2: Validate/Filter] → ParsedResults
  ↓
[Stage 3: Generate/Transform] → Dashboard Data
  ↓
Output (UI/File)
```

### 2. Start from Output and Work Backward

Check at each stage:

```typescript
// Stage 3: Check output structure
const dashboardData = generatedData;
console.log(dashboardData.runId);  // Empty? Null? Expected value?

// Stage 2: Check intermediate data
const parsedResults = [];
console.log(parsedResults.length);  // 0? Should be > 0?

// Stage 1: Check loaded data
const manifest = loadManifest();
console.log(manifest.results?.length);  // Is results defined? entries instead?
```

### 3. Verify Guard Clause Conditions

Critical checks that might silently skip processing:

```typescript
// Check each guard condition
if (latestRunId) {  // Is this true? Try logging
  // Processing happens inside this block
}

// Check type mismatches
for (const entry of manifest.results) {  // Is this undefined?
  // If results is undefined, loop never executes
}
```

### 4. Test Format Parsing Edge Cases

For custom formats, verify assumptions:

```javascript
// Custom format: "2026-06-02T14-00-00Z" (hyphens instead of colons)
new Date("2026-06-02T14-00-00Z").getTime()  // Returns NaN!
new Date("2026-06-02T14:00:00Z").getTime()  // Returns valid timestamp

// Compare strings lexicographically for ISO dates
"2026-06-02T14-00-00Z" > null  // Returns false (not true as expected!)
```

### 5. Validate Schema Contracts

Ensure loaded data matches expected type definition:

```typescript
// Expected (from type):
interface RunManifest {
  runId: string;
  generatedAt: string;
  fetchTime: string;  // Missing in fixture?
  statusCounts: StatusCounts;  // Missing in fixture?
  results: RunManifestEntry[];  // Or is it "entries"?
}

// Check with: JSON.stringify(loaded, null, 2) and compare fields
```

## Application Example: eVitals Lighthouse Metrics

**Symptom:** Dashboard rendered with `runId: ""`, no metrics visible.

**Diagnosis Steps:**

1. ✅ Output showed `dashboardData.runId = ""` (empty) → wrong source
2. ✅ Traced to `runOrder[0] = ""` → no runs detected
3. ✅ Traced to `latestRunId = null` → never updated in loop
4. ✅ Found guard: `if (latestRunId)` → false because null
5. ✅ Found comparison: `if (runId > latestRunId!)` → always false (JavaScript quirk)
6. ✅ Found second issue: Date parsing failed with custom format
7. ✅ Fixed: Explicit null check + custom format handling

## Reusable Checklist

- [ ] Verify output structure against expected type definition
- [ ] Check guard clause conditions that gate processing blocks
- [ ] Confirm intermediate data (arrays, objects) has expected shape
- [ ] Test format/type conversions with real data
- [ ] Add debug logging at each pipeline stage
- [ ] Validate exception handling (catch blocks) are not silently skipping
- [ ] Check field name mismatches (e.g., `results` vs `entries`)
- [ ] Confirm comparison operators work as expected with your data types

## References

- **eVitals Fix:** `generateDashboardArtifacts.cli.ts`, commit d18f19a
- **JavaScript Quirk:** `string > null` comparison evaluation
- **Custom Format:** Run ID format "YYYY-MM-DDTHH-MM-SSZ" with hyphens
