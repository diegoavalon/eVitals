// ── Types ──────────────────────────────────────────────────────────────────
export type {
  MetricStatus,
  LighthouseMetrics,
  LighthouseMetricStatuses,
  LighthouseCategoryScores,
  LighthouseRunResult,
  ParseReportOptions,
  RawLighthouseReport,
  RawLighthouseAudit,
  RawLighthouseCategory,
} from "./types";

// ── Status classifiers (canonical names) ──────────────────────────────────
export {
  classifyLcp,
  classifyCls,
  classifyTbt,
  classifyCategoryScore,
  classifyPerformanceStatus,
  worstOf,
  LCP_GOOD_THRESHOLD,
  LCP_NI_THRESHOLD,
  CLS_GOOD_THRESHOLD,
  CLS_NI_THRESHOLD,
  TBT_GOOD_THRESHOLD,
  TBT_NI_THRESHOLD,
  CATEGORY_GOOD_THRESHOLD,
  CATEGORY_NI_THRESHOLD,
} from "./classifyStatus";

// ── Status classifiers (legacy aliases — for parser.ts / parser.test.ts) ──
export {
  lcpStatus,
  clsStatus,
  tbtStatus,
  categoryScoreStatus,
  worstStatus,
  THRESHOLDS,
} from "./thresholds";

// ── Parsers ────────────────────────────────────────────────────────────────
export { parseLighthouseReport } from "./parseReport";
