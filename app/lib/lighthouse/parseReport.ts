/**
 * Lighthouse report parser (Issue #4).
 * Accepts raw Lighthouse JSON (unknown shape) and returns a typed
 * LighthouseRunResult consumed by the dashboard data generator.
 *
 * Degraded-value policy: missing or non-finite numeric fields become null.
 * "run-failed" is emitted for any status derived from a null metric/score.
 * Category scores and statuses are scoped to opts.enabledCategories.
 */

import {
  classifyLcp,
  classifyCls,
  classifyTbt,
  classifyPerformanceStatus,
  classifyCategoryScore,
  worstOf,
} from "./classifyStatus";
import type {
  LighthouseRunResult,
  LighthouseMetrics,
  LighthouseCategoryScores,
  LighthouseMetricStatuses,
  MetricStatus,
  ParseReportOptions,
  RawLighthouseReport,
  RawLighthouseAudit,
  RawLighthouseCategory,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNumericValue(audit: RawLighthouseAudit | undefined): number | null {
  const v = audit?.numericValue;
  return typeof v === "number" && isFinite(v) ? v : null;
}

function safeCategoryScore(cat: RawLighthouseCategory | undefined): number | null {
  const v = cat?.score;
  if (typeof v !== "number" || !isFinite(v)) return null;
  return v;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a raw Lighthouse JSON report object into a typed LighthouseRunResult.
 *
 * @param raw   - Parsed (but untyped) Lighthouse JSON, or null/undefined for a
 *               run that produced no report.
 * @param opts  - Per-run context: runId, enabledCategories, report paths.
 */
export function parseLighthouseReport(
  raw: unknown,
  opts: ParseReportOptions,
): LighthouseRunResult {
  const report = (typeof raw === "object" && raw !== null ? raw : {}) as RawLighthouseReport;
  const audits = report.audits ?? {};
  const categories = report.categories ?? {};

  // ── Metrics ────────────────────────────────────────────────────────────────
  const lcp = safeNumericValue(audits["largest-contentful-paint"]);
  const cls = safeNumericValue(audits["cumulative-layout-shift"]);
  const tbt = safeNumericValue(audits["total-blocking-time"]);
  const fcp = safeNumericValue(audits["first-contentful-paint"]);
  const si = safeNumericValue(audits["speed-index"]);

  const metrics: LighthouseMetrics = { lcp, cls, tbt, fcp, si };

  // ── Per-metric Statuses ────────────────────────────────────────────────────
  const metricStatuses: LighthouseMetricStatuses = {
    lcp: classifyLcp(lcp),
    cls: classifyCls(cls),
    tbt: classifyTbt(tbt),
  };

  // ── Category Scores (scoped to enabledCategories) ─────────────────────────
  const categoryScores: LighthouseCategoryScores = {};
  for (const key of opts.enabledCategories) {
    categoryScores[key] = safeCategoryScore(categories[key]);
  }

  const performanceScore = safeCategoryScore(categories["performance"]);

  // ── Category Statuses ─────────────────────────────────────────────────────
  const categoryStatuses: Record<string, MetricStatus> = {};
  for (const key of opts.enabledCategories) {
    if (key === "performance") {
      categoryStatuses[key] = classifyPerformanceStatus(lcp, cls, tbt);
    } else {
      categoryStatuses[key] = classifyCategoryScore(categoryScores[key] ?? null);
    }
  }

  // ── Overall Status: worst-of metrics + non-performance categories ──────────
  const nonPerfStatuses = opts.enabledCategories
    .filter((c) => c !== "performance")
    .map((c) => categoryStatuses[c]);

  const status = worstOf([
    metricStatuses.lcp,
    metricStatuses.cls,
    metricStatuses.tbt,
    ...nonPerfStatuses,
  ]);

  // ── Fetch Time / URL ──────────────────────────────────────────────────────
  const fetchTime = report.fetchTime ?? "";
  const requestedUrl = report.requestedUrl ?? "";
  const finalUrl = report.finalUrl ?? "";
  const device = report.configSettings?.formFactor ?? "unknown";

  return {
    runId: opts.runId,
    fetchTime,
    requestedUrl,
    finalUrl,
    device,
    status,
    metrics,
    metricStatuses,
    categoryStatuses,
    categoryScores,
    performanceScore,
    reportJsonPath: opts.reportJsonPath,
    reportHtmlPath: opts.reportHtmlPath,
  };
}
