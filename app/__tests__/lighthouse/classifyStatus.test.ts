/**
 * Status classification boundary tests — Issue #4.
 *
 * Covers every threshold edge for LCP, CLS, TBT (at/just-below/just-above)
 * and category score bands, plus the worst-of performance status logic.
 */

import { describe, it, expect } from "vitest";
import {
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
} from "~/lib/lighthouse/classifyStatus";

// ─── LCP Boundaries ──────────────────────────────────────────────────────────

describe("classifyLcp", () => {
  it("returns pass at exactly the good threshold (2500ms)", () => {
    expect(classifyLcp(LCP_GOOD_THRESHOLD)).toBe("pass");
  });

  it("returns pass just below the good threshold", () => {
    expect(classifyLcp(LCP_GOOD_THRESHOLD - 1)).toBe("pass");
  });

  it("returns needs-improvement just above the good threshold", () => {
    expect(classifyLcp(LCP_GOOD_THRESHOLD + 1)).toBe("needs-improvement");
  });

  it("returns needs-improvement at exactly the NI threshold (4000ms)", () => {
    expect(classifyLcp(LCP_NI_THRESHOLD)).toBe("needs-improvement");
  });

  it("returns needs-improvement just below the NI threshold", () => {
    expect(classifyLcp(LCP_NI_THRESHOLD - 1)).toBe("needs-improvement");
  });

  it("returns fail just above the NI threshold", () => {
    expect(classifyLcp(LCP_NI_THRESHOLD + 1)).toBe("fail");
  });

  it("returns fail for very large values", () => {
    expect(classifyLcp(10000)).toBe("fail");
  });

  it("returns pass for 0ms (edge case)", () => {
    expect(classifyLcp(0)).toBe("pass");
  });

  it("returns run-failed for null", () => {
    expect(classifyLcp(null)).toBe("run-failed");
  });
});

// ─── CLS Boundaries ──────────────────────────────────────────────────────────

describe("classifyCls", () => {
  it("returns pass at exactly the good threshold (0.1)", () => {
    expect(classifyCls(CLS_GOOD_THRESHOLD)).toBe("pass");
  });

  it("returns pass just below the good threshold", () => {
    expect(classifyCls(CLS_GOOD_THRESHOLD - 0.001)).toBe("pass");
  });

  it("returns needs-improvement just above the good threshold", () => {
    expect(classifyCls(CLS_GOOD_THRESHOLD + 0.001)).toBe("needs-improvement");
  });

  it("returns needs-improvement at exactly the NI threshold (0.25)", () => {
    expect(classifyCls(CLS_NI_THRESHOLD)).toBe("needs-improvement");
  });

  it("returns needs-improvement just below the NI threshold", () => {
    expect(classifyCls(CLS_NI_THRESHOLD - 0.001)).toBe("needs-improvement");
  });

  it("returns fail just above the NI threshold", () => {
    expect(classifyCls(CLS_NI_THRESHOLD + 0.001)).toBe("fail");
  });

  it("returns fail for very large CLS", () => {
    expect(classifyCls(1.0)).toBe("fail");
  });

  it("returns pass for 0 (no layout shift)", () => {
    expect(classifyCls(0)).toBe("pass");
  });

  it("returns run-failed for null", () => {
    expect(classifyCls(null)).toBe("run-failed");
  });
});

// ─── TBT Boundaries ──────────────────────────────────────────────────────────

describe("classifyTbt", () => {
  it("returns pass at exactly the good threshold (200ms)", () => {
    expect(classifyTbt(TBT_GOOD_THRESHOLD)).toBe("pass");
  });

  it("returns pass just below the good threshold", () => {
    expect(classifyTbt(TBT_GOOD_THRESHOLD - 1)).toBe("pass");
  });

  it("returns needs-improvement just above the good threshold", () => {
    expect(classifyTbt(TBT_GOOD_THRESHOLD + 1)).toBe("needs-improvement");
  });

  it("returns needs-improvement at exactly the NI threshold (600ms)", () => {
    expect(classifyTbt(TBT_NI_THRESHOLD)).toBe("needs-improvement");
  });

  it("returns needs-improvement just below the NI threshold", () => {
    expect(classifyTbt(TBT_NI_THRESHOLD - 1)).toBe("needs-improvement");
  });

  it("returns fail just above the NI threshold", () => {
    expect(classifyTbt(TBT_NI_THRESHOLD + 1)).toBe("fail");
  });

  it("returns fail for very large TBT", () => {
    expect(classifyTbt(5000)).toBe("fail");
  });

  it("returns pass for 0ms (no blocking)", () => {
    expect(classifyTbt(0)).toBe("pass");
  });

  it("returns run-failed for null", () => {
    expect(classifyTbt(null)).toBe("run-failed");
  });
});

// ─── Category Score Boundaries ───────────────────────────────────────────────

describe("classifyCategoryScore", () => {
  it("returns pass at exactly the good threshold (0.9)", () => {
    expect(classifyCategoryScore(CATEGORY_GOOD_THRESHOLD)).toBe("pass");
  });

  it("returns pass just above the good threshold (0.91)", () => {
    expect(classifyCategoryScore(0.91)).toBe("pass");
  });

  it("returns pass at perfect score (1.0)", () => {
    expect(classifyCategoryScore(1.0)).toBe("pass");
  });

  it("returns needs-improvement just below the good threshold (0.89)", () => {
    expect(classifyCategoryScore(CATEGORY_GOOD_THRESHOLD - 0.01)).toBe("needs-improvement");
  });

  it("returns needs-improvement at exactly the NI threshold (0.5)", () => {
    expect(classifyCategoryScore(CATEGORY_NI_THRESHOLD)).toBe("needs-improvement");
  });

  it("returns needs-improvement just above the NI threshold (0.51)", () => {
    expect(classifyCategoryScore(CATEGORY_NI_THRESHOLD + 0.01)).toBe("needs-improvement");
  });

  it("returns fail just below the NI threshold (0.49)", () => {
    expect(classifyCategoryScore(CATEGORY_NI_THRESHOLD - 0.01)).toBe("fail");
  });

  it("returns fail at 0", () => {
    expect(classifyCategoryScore(0)).toBe("fail");
  });

  it("returns run-failed for null", () => {
    expect(classifyCategoryScore(null)).toBe("run-failed");
  });
});

// ─── Worst-of Performance Status ─────────────────────────────────────────────

describe("classifyPerformanceStatus", () => {
  it("returns pass when all three metrics are pass", () => {
    // LCP=2000ms (pass), CLS=0.05 (pass), TBT=100ms (pass)
    expect(classifyPerformanceStatus(2000, 0.05, 100)).toBe("pass");
  });

  it("returns needs-improvement when LCP is needs-improvement and others are pass", () => {
    expect(classifyPerformanceStatus(3000, 0.05, 100)).toBe("needs-improvement");
  });

  it("returns needs-improvement when CLS is needs-improvement and others are pass", () => {
    expect(classifyPerformanceStatus(2000, 0.15, 100)).toBe("needs-improvement");
  });

  it("returns needs-improvement when TBT is needs-improvement and others are pass", () => {
    expect(classifyPerformanceStatus(2000, 0.05, 400)).toBe("needs-improvement");
  });

  it("returns fail when TBT is fail (and others are better)", () => {
    expect(classifyPerformanceStatus(2000, 0.05, 700)).toBe("fail");
  });

  it("returns fail when LCP is fail (and others are pass)", () => {
    expect(classifyPerformanceStatus(5000, 0.05, 100)).toBe("fail");
  });

  it("returns fail when CLS is fail (and others are pass)", () => {
    expect(classifyPerformanceStatus(2000, 0.3, 100)).toBe("fail");
  });

  it("returns fail when ALL three are fail", () => {
    expect(classifyPerformanceStatus(5000, 0.3, 700)).toBe("fail");
  });

  it("returns fail as worst-of when one metric fails and another needs-improvement", () => {
    // TBT=700 (fail), LCP=3000 (needs-improvement), CLS=0.15 (needs-improvement)
    expect(classifyPerformanceStatus(3000, 0.15, 700)).toBe("fail");
  });

  it("returns needs-improvement as worst-of when two are ni and one is pass", () => {
    expect(classifyPerformanceStatus(3000, 0.15, 100)).toBe("needs-improvement");
  });

  it("returns run-failed when any metric is null", () => {
    expect(classifyPerformanceStatus(null, 0.05, 100)).toBe("run-failed");
    expect(classifyPerformanceStatus(2000, null, 100)).toBe("run-failed");
    expect(classifyPerformanceStatus(2000, 0.05, null)).toBe("run-failed");
  });
});

// ─── worstOf ─────────────────────────────────────────────────────────────────

describe("worstOf", () => {
  it("returns run-failed for empty array", () => {
    expect(worstOf([])).toBe("run-failed");
  });

  it("returns pass when all are pass", () => {
    expect(worstOf(["pass", "pass", "pass"])).toBe("pass");
  });

  it("returns needs-improvement when worst is needs-improvement", () => {
    expect(worstOf(["pass", "needs-improvement", "pass"])).toBe("needs-improvement");
  });

  it("returns fail when any is fail", () => {
    expect(worstOf(["pass", "needs-improvement", "fail"])).toBe("fail");
  });

  it("returns run-failed when any is run-failed (even with fail present)", () => {
    expect(worstOf(["fail", "run-failed", "pass"])).toBe("run-failed");
  });
});
