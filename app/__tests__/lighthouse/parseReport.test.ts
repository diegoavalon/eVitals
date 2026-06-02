/**
 * Parsing contract tests — Issue #4.
 *
 * Uses the real Lighthouse fixture from `fixtures/` to assert:
 *   - category score extraction (scoped to enabledCategories, 0–1)
 *   - performance score extraction
 *   - LCP/CLS/TBT metric extraction (numeric values, nullable)
 *   - per-metric status derivation (pass/needs-improvement/fail/run-failed)
 *   - overall performance status (worst-of logic)
 *   - report path preservation (reportJsonPath / reportHtmlPath)
 *   - fetchTime, requestedUrl, finalUrl, device extraction from JSON
 *   - degraded-value behaviour for missing / malformed fields
 *   - typed result-model shape (all required fields present)
 */

import { describe, it, expect } from "vitest";
import { parseLighthouseReport } from "~/lib/lighthouse/parseReport";
import type { LighthouseRunResult } from "~/lib/lighthouse/types";
import fixtureReport from "../../../fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json";

// ─── Fixture values (asserted from real report) ───────────────────────────────
// LCP:  2863.38 ms  → needs-improvement  (>2500 ≤4000)
// CLS:  0.020275    → pass               (≤0.1)
// TBT:  2040.50 ms  → fail               (>600)
// Performance score: 0.6 (raw 0–1)
// Accessibility score: 0.88
// Best-practices score: 1.0
// SEO score: 1.0
// Overall performance status: fail (worst of lcp=needs-improvement, cls=pass, tbt=fail)

const OPTS = {
  runId: "2026-06-02T14-00-00Z",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.json",
  reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.html",
};

describe("parseLighthouseReport — fixture contract", () => {
  let result: LighthouseRunResult;

  // Parse once; all tests share the result
  result = parseLighthouseReport(fixtureReport, OPTS);

  // ── Result model shape ─────────────────────────────────────────────────────
  it("returns a result with all required top-level fields", () => {
    expect(result).toMatchObject({
      runId: expect.any(String),
      fetchTime: expect.any(String),
      requestedUrl: expect.any(String),
      finalUrl: expect.any(String),
      device: expect.any(String),
      status: expect.any(String),
      metrics: expect.any(Object),
      metricStatuses: expect.any(Object),
      categoryScores: expect.any(Object),
      categoryStatuses: expect.any(Object),
      reportJsonPath: expect.any(String),
      reportHtmlPath: expect.any(String),
    });
  });

  // ── Context fields passthrough ─────────────────────────────────────────────
  it("preserves runId from options", () => {
    expect(result.runId).toBe(OPTS.runId);
  });

  // ── Report path preservation ───────────────────────────────────────────────
  it("preserves reportJsonPath exactly", () => {
    expect(result.reportJsonPath).toBe(OPTS.reportJsonPath);
  });

  it("preserves reportHtmlPath exactly", () => {
    expect(result.reportHtmlPath).toBe(OPTS.reportHtmlPath);
  });

  // ── Fetch time / URL / device extraction ──────────────────────────────────
  it("extracts fetchTime from the report", () => {
    expect(result.fetchTime).toBe("2026-06-02T16:19:41.855Z");
  });

  it("extracts requestedUrl from the report", () => {
    expect(result.requestedUrl).toBe("https://www.ehealthinsurance.com/");
  });

  it("extracts finalUrl from the report", () => {
    expect(result.finalUrl).toBe("https://www.ehealthinsurance.com/");
  });

  it("extracts device (formFactor) from configSettings", () => {
    expect(result.device).toBe("mobile");
  });

  // ── Performance metric extraction ─────────────────────────────────────────
  it("extracts LCP numeric value in ms (≈2863ms)", () => {
    expect(result.metrics.lcp).toBeCloseTo(2863.38, 0);
  });

  it("extracts CLS numeric value (≈0.020275)", () => {
    expect(result.metrics.cls).toBeCloseTo(0.020275, 4);
  });

  it("extracts TBT numeric value in ms (≈2040ms)", () => {
    expect(result.metrics.tbt).toBeCloseTo(2040.5, 0);
  });

  // ── Category score extraction (0–1) ──────────────────────────────────────
  it("extracts performance category score as 0–1 decimal (0.6)", () => {
    expect(result.categoryScores["performance"]).toBeCloseTo(0.6, 2);
  });

  it("extracts accessibility category score as 0–1 decimal (0.88)", () => {
    expect(result.categoryScores["accessibility"]).toBeCloseTo(0.88, 2);
  });

  it("extracts best-practices category score as 0–1 decimal (1.0)", () => {
    expect(result.categoryScores["best-practices"]).toBeCloseTo(1.0, 2);
  });

  it("extracts seo category score as 0–1 decimal (1.0)", () => {
    expect(result.categoryScores["seo"]).toBeCloseTo(1.0, 2);
  });

  it("exposes performanceScore separately (0.6)", () => {
    expect(result.performanceScore).toBeCloseTo(0.6, 2);
  });

  // ── Per-metric status derivation ──────────────────────────────────────────
  it("classifies LCP as needs-improvement for fixture (2863ms > 2500ms)", () => {
    expect(result.metricStatuses.lcp).toBe("needs-improvement");
  });

  it("classifies CLS as pass for fixture (0.020 ≤ 0.1)", () => {
    expect(result.metricStatuses.cls).toBe("pass");
  });

  it("classifies TBT as fail for fixture (2040ms > 600ms)", () => {
    expect(result.metricStatuses.tbt).toBe("fail");
  });

  // ── Category statuses ─────────────────────────────────────────────────────
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

  // ── Overall performance status (worst-of) ─────────────────────────────────
  it("sets overall status to fail (worst of needs-improvement/pass/fail)", () => {
    expect(result.status).toBe("fail");
  });

  // ── Only enabledCategories included ───────────────────────────────────────
  it("includes only enabledCategories in categoryScores", () => {
    expect(Object.keys(result.categoryScores).sort()).toEqual(
      OPTS.enabledCategories.slice().sort()
    );
  });

  it("excludes categories not in enabledCategories (e.g. agentic-browsing)", () => {
    expect("agentic-browsing" in result.categoryScores).toBe(false);
  });
});

// ─── Degraded-value / resilience ─────────────────────────────────────────────

describe("parseLighthouseReport — malformed/missing fields", () => {
  it("returns null for LCP when audits key is missing", () => {
    const result = parseLighthouseReport({ categories: {}, audits: {} }, OPTS);
    expect(result.metrics.lcp).toBeNull();
  });

  it("returns null for CLS when audits key is missing", () => {
    const result = parseLighthouseReport({ categories: {}, audits: {} }, OPTS);
    expect(result.metrics.cls).toBeNull();
  });

  it("returns null for TBT when audits key is missing", () => {
    const result = parseLighthouseReport({ categories: {}, audits: {} }, OPTS);
    expect(result.metrics.tbt).toBeNull();
  });

  it("returns null for all category scores when categories object is empty", () => {
    const result = parseLighthouseReport({ audits: {}, categories: {} }, OPTS);
    expect(result.categoryScores["performance"]).toBeNull();
    expect(result.categoryScores["accessibility"]).toBeNull();
    expect(result.categoryScores["best-practices"]).toBeNull();
    expect(result.categoryScores["seo"]).toBeNull();
  });

  it("returns null for category score when score is null", () => {
    const result = parseLighthouseReport(
      { audits: {}, categories: { performance: { score: null } } },
      OPTS,
    );
    expect(result.categoryScores["performance"]).toBeNull();
  });

  it("does not throw when the entire report is null", () => {
    expect(() => parseLighthouseReport(null, OPTS)).not.toThrow();
  });

  it("does not throw when the report is an empty object", () => {
    expect(() => parseLighthouseReport({}, OPTS)).not.toThrow();
  });

  it("does not throw when an audit numericValue is NaN", () => {
    const report = {
      audits: { "largest-contentful-paint": { numericValue: NaN } },
      categories: {},
    };
    expect(() => parseLighthouseReport(report, OPTS)).not.toThrow();
  });

  it("returns null for LCP when numericValue is NaN", () => {
    const report = {
      audits: { "largest-contentful-paint": { numericValue: NaN } },
      categories: {},
    };
    const result = parseLighthouseReport(report, OPTS);
    expect(result.metrics.lcp).toBeNull();
  });

  it("returns run-failed metric status when metric is null", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result.metricStatuses.lcp).toBe("run-failed");
    expect(result.metricStatuses.cls).toBe("run-failed");
    expect(result.metricStatuses.tbt).toBe("run-failed");
  });

  it("returns empty string for fetchTime when missing", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result.fetchTime).toBe("");
  });

  it("returns empty string for requestedUrl when missing", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result.requestedUrl).toBe("");
  });

  it("returns 'unknown' for device when configSettings missing", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result.device).toBe("unknown");
  });

  it("returns run-failed overall status when all metrics are null", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result.status).toBe("run-failed");
  });

  it("still returns a fully-structured result for empty report", () => {
    const result = parseLighthouseReport({}, OPTS);
    expect(result).toMatchObject({
      runId: OPTS.runId,
      fetchTime: "",
      requestedUrl: "",
      finalUrl: "",
      device: "unknown",
      reportJsonPath: OPTS.reportJsonPath,
      reportHtmlPath: OPTS.reportHtmlPath,
      metrics: { lcp: null, cls: null, tbt: null },
      metricStatuses: { lcp: "run-failed", cls: "run-failed", tbt: "run-failed" },
    });
  });
});

// ─── enabledCategories scoping ────────────────────────────────────────────────

describe("parseLighthouseReport — enabledCategories scoping", () => {
  it("scopes categoryScores to only the two enabled categories", () => {
    const opts = { ...OPTS, enabledCategories: ["performance", "seo"] };
    const result = parseLighthouseReport(fixtureReport, opts);
    expect(Object.keys(result.categoryScores)).toEqual(["performance", "seo"]);
  });

  it("scopes categoryStatuses to only the two enabled categories", () => {
    const opts = { ...OPTS, enabledCategories: ["performance", "seo"] };
    const result = parseLighthouseReport(fixtureReport, opts);
    expect(Object.keys(result.categoryStatuses)).toEqual(["performance", "seo"]);
  });

  it("overall status uses only non-performance enabled categories", () => {
    // With only seo enabled (score 1.0 = pass), and metrics all passing:
    const opts = { ...OPTS, enabledCategories: ["seo"] };
    const input = {
      audits: {
        "largest-contentful-paint": { numericValue: 1000 },
        "cumulative-layout-shift": { numericValue: 0.01 },
        "total-blocking-time": { numericValue: 50 },
      },
      categories: { seo: { score: 1.0 } },
      configSettings: { formFactor: "mobile" },
    };
    const result = parseLighthouseReport(input, opts);
    // seo status = pass (score 1.0), metrics = pass → overall = pass
    expect(result.status).toBe("pass");
  });
});
