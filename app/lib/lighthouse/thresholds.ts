/**
 * Re-exports from classifyStatus for backward-compat with parser.ts aliases.
 * Canonical exports live in classifyStatus.ts.
 */
export {
  classifyLcp as lcpStatus,
  classifyCls as clsStatus,
  classifyTbt as tbtStatus,
  classifyCategoryScore as categoryScoreStatus,
  worstOf as worstStatus,
  LCP_GOOD_THRESHOLD as LCP_GOOD_MS,
  LCP_NI_THRESHOLD as LCP_POOR_MS,
  CLS_GOOD_THRESHOLD as CLS_GOOD,
  CLS_NI_THRESHOLD as CLS_POOR,
  TBT_GOOD_THRESHOLD as TBT_GOOD_MS,
  TBT_NI_THRESHOLD as TBT_POOR_MS,
  CATEGORY_GOOD_THRESHOLD as SCORE_PASS,
  CATEGORY_NI_THRESHOLD as SCORE_NEEDS,
} from "./classifyStatus";

export const THRESHOLDS = {
  LCP_GOOD_MS: 2_500,
  LCP_POOR_MS: 4_000,
  CLS_GOOD: 0.1,
  CLS_POOR: 0.25,
  TBT_GOOD_MS: 200,
  TBT_POOR_MS: 600,
  SCORE_PASS: 0.9,
  SCORE_NEEDS: 0.5,
} as const;
