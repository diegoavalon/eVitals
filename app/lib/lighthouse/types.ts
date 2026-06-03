/**
 * Types for the Lighthouse parsing + status classification layer (Issue #4).
 * Consumed by the dashboard data generator; stable interface shared across
 * runner scripts and app lib.
 *
 * Status vocabulary aligns with Trinity's implementation (thresholds.ts / parser.ts):
 *   "pass" = good, "fail" = failing, "run-failed" = missing/malformed data.
 */

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * Per-metric / per-category status.
 * "run-failed" signals that the underlying data was null/missing.
 */
export type MetricStatus = "pass" | "needs-improvement" | "fail" | "run-failed";

// ─── Metrics ─────────────────────────────────────────────────────────────────

/** Core Web Vitals extracted from a Lighthouse report. null = missing/malformed. */
export interface LighthouseMetrics {
  /** Largest Contentful Paint in ms */
  lcp: number | null;
  /** Cumulative Layout Shift (unitless) */
  cls: number | null;
  /** Total Blocking Time in ms */
  tbt: number | null;
  /** First Contentful Paint in ms */
  fcp: number | null;
  /** Speed Index in ms */
  si: number | null;
}

// ─── Per-metric Status ───────────────────────────────────────────────────────

export interface LighthouseMetricStatuses {
  lcp: MetricStatus;
  cls: MetricStatus;
  tbt: MetricStatus;
}

// ─── Category Scores / Statuses ──────────────────────────────────────────────

/**
 * Lighthouse category scores as raw 0.0-1.0 floats; null = missing.
 * Scoped to enabledCategories from ParseReportOptions.
 */
export type LighthouseCategoryScores = Record<string, number | null>;

export type LighthouseCategoryStatuses = Record<string, MetricStatus>;

// ─── Full Run Result ─────────────────────────────────────────────────────────

/**
 * Canonical per-page/device result model output by the parser (parser.ts).
 * Stable interface consumed by the dashboard data generator (issue #5).
 */
export interface LighthouseRunResult {
  runId: string;
  fetchTime: string;
  requestedUrl: string;
  finalUrl: string;
  /** Extracted from configSettings.formFactor; "unknown" if absent. */
  device: string;
  /** Overall status: worst-of all metric + non-perf category statuses. */
  status: MetricStatus;
  metrics: LighthouseMetrics;
  metricStatuses: LighthouseMetricStatuses;
  /** Scoped to enabledCategories. */
  categoryScores: LighthouseCategoryScores;
  /** Raw performance score (0.0-1.0); null if missing. */
  performanceScore: number | null;
  /** Scoped to enabledCategories. Performance status derived from CWV metrics. */
  categoryStatuses: LighthouseCategoryStatuses;
  reportJsonPath: string;
  reportHtmlPath: string;
}

/** Options passed to parseLighthouseReport. */
export interface ParseReportOptions {
  runId: string;
  enabledCategories: string[];
  reportJsonPath: string;
  reportHtmlPath: string;
}

/** Shape of a raw Lighthouse category object in the report */
export interface RawLighthouseCategory {
  score?: number | null;
  title?: string;
}

/** Shape of a raw Lighthouse audit entry */
export interface RawLighthouseAudit {
  numericValue?: number;
  score?: number | null;
  displayValue?: string;
}

/** Minimal typed shape of a raw Lighthouse JSON report */
export interface RawLighthouseReport {
  fetchTime?: string;
  requestedUrl?: string;
  finalUrl?: string;
  configSettings?: { formFactor?: string };
  categories?: Record<string, RawLighthouseCategory>;
  audits?: Record<string, RawLighthouseAudit>;
}
