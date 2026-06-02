import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseLighthouseReport,
  lcpStatus,
  clsStatus,
  tbtStatus,
  categoryScoreStatus,
  worstStatus,
  THRESHOLDS,
} from "../../lib/lighthouse";
import type { ParseReportOptions } from "../../lib/lighthouse";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const FIXTURE_JSON_PATH = resolve(
  __dirname,
  "../../../fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json"
);

function loadFixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE_JSON_PATH, "utf-8"));
}

const BASE_OPTS: ParseReportOptions = {
  runId: "2026-06-02T14-00-00Z",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.json",
  reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.html",
};

// ---------------------------------------------------------------------------
// Threshold constants
// ---------------------------------------------------------------------------

describe("THRESHOLDS", () => {
  it("exports expected threshold values", () => {
    expect(THRESHOLDS.LCP_GOOD_MS).toBe(2_500);
    expect(THRESHOLDS.LCP_POOR_MS).toBe(4_000);
    expect(THRESHOLDS.CLS_GOOD).toBe(0.1);
    expect(THRESHOLDS.CLS_POOR).toBe(0.25);
    expect(THRESHOLDS.TBT_GOOD_MS).toBe(200);
    expect(THRESHOLDS.TBT_POOR_MS).toBe(600);
    expect(THRESHOLDS.SCORE_PASS).toBe(0.9);
    expect(THRESHOLDS.SCORE_NEEDS).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// lcpStatus — boundary tests
// ---------------------------------------------------------------------------

describe("lcpStatus", () => {
  it("returns run-failed for null", () => {
    expect(lcpStatus(null)).toBe("run-failed");
  });

  // pass boundary (≤ 2500 ms)
  it("returns pass at good boundary (2500 ms)", () => {
    expect(lcpStatus(2_500)).toBe("pass");
  });
  it("returns pass just below good boundary (2499 ms)", () => {
    expect(lcpStatus(2_499)).toBe("pass");
  });
  it("returns needs-improvement just above good boundary (2501 ms)", () => {
    expect(lcpStatus(2_501)).toBe("needs-improvement");
  });

  // needs-improvement boundary (≤ 4000 ms)
  it("returns needs-improvement at poor boundary (4000 ms)", () => {
    expect(lcpStatus(4_000)).toBe("needs-improvement");
  });
  it("returns fail just above poor boundary (4001 ms)", () => {
    expect(lcpStatus(4_001)).toBe("fail");
  });

  // clearly good / poor
  it("returns pass for clearly good LCP (1000 ms)", () => {
    expect(lcpStatus(1_000)).toBe("pass");
  });
  it("returns fail for clearly poor LCP (6000 ms)", () => {
    expect(lcpStatus(6_000)).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// clsStatus — boundary tests
// ---------------------------------------------------------------------------

describe("clsStatus", () => {
  it("returns run-failed for null", () => {
    expect(clsStatus(null)).toBe("run-failed");
  });

  // pass boundary (≤ 0.1)
  it("returns pass at good boundary (0.1)", () => {
    expect(clsStatus(0.1)).toBe("pass");
  });
  it("returns pass just below good boundary (0.09)", () => {
    expect(clsStatus(0.09)).toBe("pass");
  });
  it("returns needs-improvement just above good boundary (0.101)", () => {
    expect(clsStatus(0.101)).toBe("needs-improvement");
  });

  // needs-improvement boundary (≤ 0.25)
  it("returns needs-improvement at poor boundary (0.25)", () => {
    expect(clsStatus(0.25)).toBe("needs-improvement");
  });
  it("returns fail just above poor boundary (0.251)", () => {
    expect(clsStatus(0.251)).toBe("fail");
  });

  // clearly good / poor
  it("returns pass for zero CLS", () => {
    expect(clsStatus(0)).toBe("pass");
  });
  it("returns fail for clearly poor CLS (0.5)", () => {
    expect(clsStatus(0.5)).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// tbtStatus — boundary tests
// ---------------------------------------------------------------------------

describe("tbtStatus", () => {
  it("returns run-failed for null", () => {
    expect(tbtStatus(null)).toBe("run-failed");
  });

  // pass boundary (≤ 200 ms)
  it("returns pass at good boundary (200 ms)", () => {
    expect(tbtStatus(200)).toBe("pass");
  });
  it("returns pass just below good boundary (199 ms)", () => {
    expect(tbtStatus(199)).toBe("pass");
  });
  it("returns needs-improvement just above good boundary (201 ms)", () => {
    expect(tbtStatus(201)).toBe("needs-improvement");
  });

  // needs-improvement boundary (≤ 600 ms)
  it("returns needs-improvement at poor boundary (600 ms)", () => {
    expect(tbtStatus(600)).toBe("needs-improvement");
  });
  it("returns fail just above poor boundary (601 ms)", () => {
    expect(tbtStatus(601)).toBe("fail");
  });

  // clearly good / poor
  it("returns pass for zero TBT", () => {
    expect(tbtStatus(0)).toBe("pass");
  });
  it("returns fail for clearly poor TBT (2000 ms)", () => {
    expect(tbtStatus(2_000)).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// categoryScoreStatus — boundary tests
// ---------------------------------------------------------------------------

describe("categoryScoreStatus", () => {
  it("returns run-failed for null", () => {
    expect(categoryScoreStatus(null)).toBe("run-failed");
  });

  // pass boundary (≥ 0.9)
  it("returns pass at pass boundary (0.9)", () => {
    expect(categoryScoreStatus(0.9)).toBe("pass");
  });
  it("returns pass above pass boundary (1.0)", () => {
    expect(categoryScoreStatus(1.0)).toBe("pass");
  });
  it("returns needs-improvement just below pass boundary (0.89)", () => {
    expect(categoryScoreStatus(0.89)).toBe("needs-improvement");
  });

  // needs-improvement boundary (≥ 0.5)
  it("returns needs-improvement at needs boundary (0.5)", () => {
    expect(categoryScoreStatus(0.5)).toBe("needs-improvement");
  });
  it("returns fail just below needs boundary (0.49)", () => {
    expect(categoryScoreStatus(0.49)).toBe("fail");
  });

  // clearly failing
  it("returns fail for score 0", () => {
    expect(categoryScoreStatus(0)).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// worstStatus
// ---------------------------------------------------------------------------

describe("worstStatus", () => {
  it("returns run-failed for empty array", () => {
    expect(worstStatus([])).toBe("run-failed");
  });

  it("returns pass when all pass", () => {
    expect(worstStatus(["pass", "pass"])).toBe("pass");
  });

  it("returns needs-improvement when mixed pass and needs-improvement", () => {
    expect(worstStatus(["pass", "needs-improvement", "pass"])).toBe(
      "needs-improvement"
    );
  });

  it("returns fail when any is fail", () => {
    expect(worstStatus(["pass", "needs-improvement", "fail"])).toBe("fail");
  });

  it("returns run-failed when any is run-failed (even with fail)", () => {
    expect(worstStatus(["fail", "run-failed"])).toBe("run-failed");
  });

  it("severity order: pass < needs-improvement < fail < run-failed", () => {
    const statuses = ["run-failed", "pass", "fail", "needs-improvement"] as const;
    expect(worstStatus([...statuses])).toBe("run-failed");
  });
});

// ---------------------------------------------------------------------------
// parseLighthouseReport — fixture-driven integration tests
// ---------------------------------------------------------------------------

describe("parseLighthouseReport — real fixture", () => {
  const fixture = loadFixture();
  const result = parseLighthouseReport(fixture, BASE_OPTS);

  it("extracts runId from opts", () => {
    expect(result.runId).toBe("2026-06-02T14-00-00Z");
  });

  it("extracts fetchTime from report", () => {
    expect(result.fetchTime).toBe("2026-06-02T16:19:41.855Z");
  });

  it("extracts requestedUrl from report", () => {
    expect(result.requestedUrl).toBe("https://www.ehealthinsurance.com/");
  });

  it("extracts finalUrl from report", () => {
    expect(result.finalUrl).toBe("https://www.ehealthinsurance.com/");
  });

  it("extracts device (formFactor) from configSettings", () => {
    expect(result.device).toBe("mobile");
  });

  it("extracts report paths from opts", () => {
    expect(result.reportJsonPath).toBe(BASE_OPTS.reportJsonPath);
    expect(result.reportHtmlPath).toBe(BASE_OPTS.reportHtmlPath);
  });

  // --- Metrics ---
  it("extracts LCP numericValue in ms", () => {
    expect(result.metrics.lcp).toBeCloseTo(2863.38, 1);
  });

  it("extracts CLS numericValue", () => {
    expect(result.metrics.cls).toBeCloseTo(0.020275, 4);
  });

  it("extracts TBT numericValue in ms", () => {
    expect(result.metrics.tbt).toBeCloseTo(2040.5, 0);
  });

  // --- Metric statuses from actual fixture values ---
  it("LCP status: 2863 ms → needs-improvement", () => {
    expect(result.metricStatuses.lcp).toBe("needs-improvement");
  });

  it("CLS status: 0.020 → pass", () => {
    expect(result.metricStatuses.cls).toBe("pass");
  });

  it("TBT status: 2040 ms → fail (> 600 ms threshold)", () => {
    expect(result.metricStatuses.tbt).toBe("fail");
  });

  // --- Category scores ---
  it("includes only enabledCategories in categoryScores", () => {
    expect(Object.keys(result.categoryScores).sort()).toEqual(
      BASE_OPTS.enabledCategories.slice().sort()
    );
  });

  it("extracts performance score (0–1)", () => {
    expect(result.categoryScores["performance"]).toBeCloseTo(0.6, 2);
  });

  it("exposes performanceScore separately", () => {
    expect(result.performanceScore).toBeCloseTo(0.6, 2);
  });

  it("extracts accessibility score", () => {
    expect(result.categoryScores["accessibility"]).toBeCloseTo(0.88, 2);
  });

  it("extracts best-practices score", () => {
    expect(result.categoryScores["best-practices"]).toBeCloseTo(1.0, 2);
  });

  it("extracts seo score", () => {
    expect(result.categoryScores["seo"]).toBeCloseTo(1.0, 2);
  });

  // --- Category statuses ---
  it("performance category status = worst-of metrics (fail, because TBT fails)", () => {
    expect(result.categoryStatuses["performance"]).toBe("fail");
  });

  it("accessibility: 0.88 score → needs-improvement", () => {
    expect(result.categoryStatuses["accessibility"]).toBe("needs-improvement");
  });

  it("best-practices: 1.0 score → pass", () => {
    expect(result.categoryStatuses["best-practices"]).toBe("pass");
  });

  it("seo: 1.0 score → pass", () => {
    expect(result.categoryStatuses["seo"]).toBe("pass");
  });

  // --- Overall status ---
  it("overall status = worst-of all (fail from TBT + performance)", () => {
    expect(result.status).toBe("fail");
  });
});

// ---------------------------------------------------------------------------
// parseLighthouseReport — degraded / run-failed handling
// ---------------------------------------------------------------------------

describe("parseLighthouseReport — missing / malformed fields", () => {
  it("handles null input without throwing", () => {
    expect(() => parseLighthouseReport(null, BASE_OPTS)).not.toThrow();
  });

  it("handles undefined input without throwing", () => {
    expect(() => parseLighthouseReport(undefined, BASE_OPTS)).not.toThrow();
  });

  it("handles empty object without throwing", () => {
    expect(() => parseLighthouseReport({}, BASE_OPTS)).not.toThrow();
  });

  it("handles non-object (string) without throwing", () => {
    expect(() => parseLighthouseReport("not json", BASE_OPTS)).not.toThrow();
  });

  it("returns null metrics when audits are absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.metrics.lcp).toBeNull();
    expect(result.metrics.cls).toBeNull();
    expect(result.metrics.tbt).toBeNull();
  });

  it("returns run-failed for all metric statuses when audits absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.metricStatuses.lcp).toBe("run-failed");
    expect(result.metricStatuses.cls).toBe("run-failed");
    expect(result.metricStatuses.tbt).toBe("run-failed");
  });

  it("returns run-failed overall status when metrics absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.status).toBe("run-failed");
  });

  it("returns null category scores when categories absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.categoryScores["performance"]).toBeNull();
    expect(result.categoryScores["accessibility"]).toBeNull();
  });

  it("returns null performanceScore when performance category absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.performanceScore).toBeNull();
  });

  it("returns empty string for fetchTime when absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.fetchTime).toBe("");
  });

  it("returns empty string for requestedUrl when absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.requestedUrl).toBe("");
  });

  it("returns 'unknown' for device when configSettings absent", () => {
    const result = parseLighthouseReport({}, BASE_OPTS);
    expect(result.device).toBe("unknown");
  });

  it("handles Infinity numericValue safely (returns null metric)", () => {
    const input = {
      audits: {
        "largest-contentful-paint": { numericValue: Infinity },
        "cumulative-layout-shift": { numericValue: 0.05 },
        "total-blocking-time": { numericValue: 100 },
      },
    };
    const result = parseLighthouseReport(input, BASE_OPTS);
    expect(result.metrics.lcp).toBeNull();
    expect(result.metricStatuses.lcp).toBe("run-failed");
  });

  it("handles NaN numericValue safely (returns null metric)", () => {
    const input = {
      audits: {
        "largest-contentful-paint": { numericValue: NaN },
        "cumulative-layout-shift": { numericValue: 0 },
        "total-blocking-time": { numericValue: 50 },
      },
    };
    const result = parseLighthouseReport(input, BASE_OPTS);
    expect(result.metrics.lcp).toBeNull();
    expect(result.metricStatuses.lcp).toBe("run-failed");
  });

  it("handles category score null gracefully", () => {
    const input = {
      categories: {
        performance: { score: null },
        accessibility: { score: 0.88 },
        "best-practices": { score: 1.0 },
        seo: { score: 1.0 },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 1000 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "total-blocking-time": { numericValue: 50 },
      },
    };
    const result = parseLighthouseReport(input, BASE_OPTS);
    // performanceScore is null from categories, but category status is computed from metrics
    expect(result.performanceScore).toBeNull();
    expect(result.categoryStatuses["performance"]).toBe("pass");
  });

  it("only includes enabled categories in categoryScores", () => {
    const opts: ParseReportOptions = {
      ...BASE_OPTS,
      enabledCategories: ["performance", "seo"],
    };
    const result = parseLighthouseReport(loadFixture(), opts);
    expect(Object.keys(result.categoryScores)).toEqual(["performance", "seo"]);
    expect("accessibility" in result.categoryScores).toBe(false);
  });

  it("excludes unlisted categories from categoryStatuses", () => {
    const opts: ParseReportOptions = {
      ...BASE_OPTS,
      enabledCategories: ["seo"],
    };
    const result = parseLighthouseReport(loadFixture(), opts);
    expect(Object.keys(result.categoryStatuses)).toEqual(["seo"]);
  });
});

// ---------------------------------------------------------------------------
// parseLighthouseReport — run-failed representation
// ---------------------------------------------------------------------------

describe("parseLighthouseReport — run-failed representation", () => {
  it("result with no report data has status run-failed", () => {
    const result = parseLighthouseReport(null, BASE_OPTS);
    expect(result.status).toBe("run-failed");
  });

  it("partial metrics: missing TBT cascades to run-failed overall", () => {
    const input = {
      audits: {
        "largest-contentful-paint": { numericValue: 1000 },
        "cumulative-layout-shift": { numericValue: 0.05 },
        // total-blocking-time absent
      },
      configSettings: { formFactor: "desktop" },
    };
    const result = parseLighthouseReport(input, BASE_OPTS);
    expect(result.metrics.tbt).toBeNull();
    expect(result.metricStatuses.tbt).toBe("run-failed");
    expect(result.status).toBe("run-failed");
  });

  it("all-pass metrics + missing non-perf category → run-failed overall", () => {
    const opts: ParseReportOptions = {
      ...BASE_OPTS,
      enabledCategories: ["performance", "accessibility"],
    };
    const input = {
      audits: {
        "largest-contentful-paint": { numericValue: 500 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "total-blocking-time": { numericValue: 50 },
      },
      // no categories block
    };
    const result = parseLighthouseReport(input, opts);
    // performance status = pass (all metrics pass)
    expect(result.categoryStatuses["performance"]).toBe("pass");
    // accessibility missing → run-failed
    expect(result.categoryStatuses["accessibility"]).toBe("run-failed");
    // overall → run-failed
    expect(result.status).toBe("run-failed");
  });
});
