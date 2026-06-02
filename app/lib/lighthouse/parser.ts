import type {
  LighthouseRunResult,
  LighthouseMetrics,
  MetricStatus,
  ParseReportOptions,
} from "./types";
import {
  lcpStatus,
  clsStatus,
  tbtStatus,
  categoryScoreStatus,
  worstStatus,
} from "./thresholds";

// ---------------------------------------------------------------------------
// Internal raw-JSON shapes (safe unknown-typed access)
// ---------------------------------------------------------------------------

interface RawAudit {
  numericValue?: unknown;
  score?: unknown;
}

interface RawCategory {
  score?: unknown;
}

interface RawJson {
  fetchTime?: unknown;
  requestedUrl?: unknown;
  finalUrl?: unknown;
  configSettings?: {
    formFactor?: unknown;
  };
  categories?: Record<string, RawCategory>;
  audits?: Record<string, RawAudit>;
}

// ---------------------------------------------------------------------------
// Coercion helpers — all return safe defaults rather than throwing
// ---------------------------------------------------------------------------

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  return null;
}

function toNonEmptyString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.length > 0) return v;
  return fallback;
}

function toRawJson(v: unknown): RawJson {
  return v != null && typeof v === "object" ? (v as RawJson) : {};
}

function toAudits(v: unknown): Record<string, RawAudit> {
  return v != null && typeof v === "object"
    ? (v as Record<string, RawAudit>)
    : {};
}

function toCategories(v: unknown): Record<string, RawCategory> {
  return v != null && typeof v === "object"
    ? (v as Record<string, RawCategory>)
    : {};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a raw Lighthouse JSON report into a typed `LighthouseRunResult`.
 *
 * - Missing or malformed audit fields are represented as `null`; no exceptions
 *   are thrown for malformed input.
 * - "run-failed" is emitted for any status whose underlying metric is null.
 * - Category scores and statuses are scoped to `opts.enabledCategories`.
 * - The performance category status is derived from worst-of LCP/CLS/TBT
 *   metric statuses, not from the raw performance score band.
 */
export function parseLighthouseReport(
  rawJson: unknown,
  opts: ParseReportOptions
): LighthouseRunResult {
  const raw = toRawJson(rawJson);
  const audits = toAudits(raw.audits);
  const categories = toCategories(raw.categories);

  // --- Core Web Vitals -------------------------------------------------
  const lcp = toFiniteNumber(audits["largest-contentful-paint"]?.numericValue);
  const cls = toFiniteNumber(
    audits["cumulative-layout-shift"]?.numericValue
  );
  const tbt = toFiniteNumber(audits["total-blocking-time"]?.numericValue);

  const metrics: LighthouseMetrics = { lcp, cls, tbt };

  const metricStatuses = {
    lcp: lcpStatus(lcp),
    cls: clsStatus(cls),
    tbt: tbtStatus(tbt),
  };

  // --- Category scores -------------------------------------------------
  const categoryScores: Record<string, number | null> = {};
  for (const cat of opts.enabledCategories) {
    categoryScores[cat] = toFiniteNumber(categories[cat]?.score ?? null);
  }

  const performanceScore = toFiniteNumber(categories["performance"]?.score ?? null);

  // --- Category statuses -----------------------------------------------
  const categoryStatuses: Record<string, MetricStatus> = {};
  for (const cat of opts.enabledCategories) {
    if (cat === "performance") {
      // Performance status comes from Core Web Vitals, not the score band
      categoryStatuses[cat] = worstStatus([
        metricStatuses.lcp,
        metricStatuses.cls,
        metricStatuses.tbt,
      ]);
    } else {
      categoryStatuses[cat] = categoryScoreStatus(categoryScores[cat] ?? null);
    }
  }

  // --- Overall run status: worst-of all individual statuses -----------
  const nonPerfStatuses = opts.enabledCategories
    .filter((c) => c !== "performance")
    .map((c) => categoryStatuses[c]);

  const status = worstStatus([
    metricStatuses.lcp,
    metricStatuses.cls,
    metricStatuses.tbt,
    ...nonPerfStatuses,
  ]);

  return {
    runId: opts.runId,
    fetchTime: toNonEmptyString(raw.fetchTime, ""),
    requestedUrl: toNonEmptyString(raw.requestedUrl, ""),
    finalUrl: toNonEmptyString(raw.finalUrl, ""),
    device: toNonEmptyString(raw.configSettings?.formFactor, "unknown"),
    categoryScores,
    performanceScore,
    metrics,
    metricStatuses,
    categoryStatuses,
    status,
    reportJsonPath: opts.reportJsonPath,
    reportHtmlPath: opts.reportHtmlPath,
  };
}
