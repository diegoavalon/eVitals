/**
 * Status classification for Lighthouse metrics and category scores.
 * All thresholds are from the PRD (app/docs/00_Initial.md).
 */

import type { MetricStatus } from "./types";

// ─── Performance Metric Thresholds ───────────────────────────────────────────
// LCP (ms)
export const LCP_GOOD_THRESHOLD = 2500;
export const LCP_NI_THRESHOLD = 4000;

// CLS (unitless ratio)
export const CLS_GOOD_THRESHOLD = 0.1;
export const CLS_NI_THRESHOLD = 0.25;

// TBT (ms)
export const TBT_GOOD_THRESHOLD = 200;
export const TBT_NI_THRESHOLD = 600;

// FCP (ms)
export const FCP_GOOD_THRESHOLD = 1800;
export const FCP_NI_THRESHOLD = 3000;

// Speed Index (ms)
export const SI_GOOD_THRESHOLD = 3400;
export const SI_NI_THRESHOLD = 5800;

// Category score (0–1)
export const CATEGORY_GOOD_THRESHOLD = 0.9;
export const CATEGORY_NI_THRESHOLD = 0.5;

// ─── Individual Metric Classifiers ───────────────────────────────────────────

/** Classify LCP status from millisecond value. Returns "run-failed" for null. */
export function classifyLcp(valueMs: number | null): MetricStatus {
  if (valueMs === null) return "run-failed";
  if (valueMs <= LCP_GOOD_THRESHOLD) return "pass";
  if (valueMs <= LCP_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

/** Classify CLS status from unitless value. Returns "run-failed" for null. */
export function classifyCls(value: number | null): MetricStatus {
  if (value === null) return "run-failed";
  if (value <= CLS_GOOD_THRESHOLD) return "pass";
  if (value <= CLS_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

/** Classify TBT status from millisecond value. Returns "run-failed" for null. */
export function classifyTbt(valueMs: number | null): MetricStatus {
  if (valueMs === null) return "run-failed";
  if (valueMs <= TBT_GOOD_THRESHOLD) return "pass";
  if (valueMs <= TBT_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

/** Classify FCP status from millisecond value. Returns "run-failed" for null. */
export function classifyFcp(valueMs: number | null): MetricStatus {
  if (valueMs === null) return "run-failed";
  if (valueMs <= FCP_GOOD_THRESHOLD) return "pass";
  if (valueMs <= FCP_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

/** Classify Speed Index status from millisecond value. Returns "run-failed" for null. */
export function classifySi(valueMs: number | null): MetricStatus {
  if (valueMs === null) return "run-failed";
  if (valueMs <= SI_GOOD_THRESHOLD) return "pass";
  if (valueMs <= SI_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

// ─── Category Score Classifier ───────────────────────────────────────────────

/**
 * Classify a Lighthouse category score (0–1).
 * Returns "run-failed" for null.
 */
export function classifyCategoryScore(score: number | null): MetricStatus {
  if (score === null) return "run-failed";
  if (score >= CATEGORY_GOOD_THRESHOLD) return "pass";
  if (score >= CATEGORY_NI_THRESHOLD) return "needs-improvement";
  return "fail";
}

// ─── Performance Status (Worst-of) ───────────────────────────────────────────

const STATUS_RANK: Record<MetricStatus, number> = {
  pass: 0,
  "needs-improvement": 1,
  fail: 2,
  "run-failed": 3,
};

/** Returns the worst (highest-severity) MetricStatus from a list. */
export function worstOf(statuses: MetricStatus[]): MetricStatus {
  if (statuses.length === 0) return "run-failed";
  return statuses.reduce<MetricStatus>(
    (worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst),
    "pass",
  );
}

export function classifyPerformanceStatus(
  lcpMs: number | null,
  cls: number | null,
  tbtMs: number | null,
): MetricStatus {
  const statuses: MetricStatus[] = [
    classifyLcp(lcpMs),
    classifyCls(cls),
    classifyTbt(tbtMs),
  ];
  return statuses.reduce((worst, current) =>
    STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst,
  );
}
