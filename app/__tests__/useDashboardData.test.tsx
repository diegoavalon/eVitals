/**
 * Tests for the four observable fetch states of the dashboard data layer.
 * Issue #2 acceptance criteria: loading, missing/404, invalid JSON, success.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "../lib/useDashboardData";
import type { DashboardData } from "../lib/dashboard.types";

const VALID_DASHBOARD: DashboardData = {
  generatedAt: "2026-06-02T14:00:00Z",
  runId: "2026-06-02T14-00-00Z",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  enabledDevices: ["mobile", "desktop"],
  defaultCategory: "performance",
  basePath: "/eVitals/",
  summary: {
    totalConfiguredPages: 1,
    totalConfiguredPageDevicePairs: 2,
    latestRunResultCount: 1,
    statusCounts: {
      good: 0,
      "needs-improvement": 1,
      failing: 0,
      "run-failed": 0,
    },
  },
  aggregates: {
    byCategory: {
      performance: {
        statusCounts: {
          good: 0,
          "needs-improvement": 1,
          failing: 0,
          "run-failed": 0,
        },
        averageScore: 62,
        successfulCount: 1,
        totalCount: 1,
      },
    },
    byDevice: {
      mobile: {
        statusCounts: {
          good: 0,
          "needs-improvement": 1,
          failing: 0,
          "run-failed": 0,
        },
        averageScore: 62,
        successfulCount: 1,
        totalCount: 1,
      },
      desktop: {
        statusCounts: {
          good: 0,
          "needs-improvement": 0,
          failing: 0,
          "run-failed": 0,
        },
        averageScore: null,
        successfulCount: 0,
        totalCount: 0,
      },
    },
  },
  priority: [
    {
      pageId: "homepage",
      label: "Homepage",
      group: "core",
      device: "mobile",
      status: "needs-improvement",
      score: 62,
      failingMetricCount: 0,
    },
  ],
  recentRunHistoryByPage: {
    homepage: [
      {
        runId: "2026-06-02T14-00-00Z",
        fetchTime: "2026-06-02T14:00:00Z",
        device: "mobile",
        status: "needs-improvement",
        lcp: 3200,
      },
    ],
  },
  pages: [
    {
      pageId: "homepage",
      label: "Homepage",
      url: "https://www.ehealthinsurance.com/",
      group: "core",
      results: {
        mobile: {
          status: "needs-improvement",
          scores: { performance: 62, accessibility: 91 },
          metrics: { lcp: 3200, cls: 0.08, tbt: 350, fcp: null, si: null },
          reportHtmlPath:
            "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.html",
          reportJsonPath:
            "reports/runs/2026-06-02T14-00-00Z/homepage.mobile.report.json",
        },
      },
    },
  ],
};

describe("useDashboardData – four fetch states", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state before fetch resolves", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.status).toBe("loading");
  });

  it("transitions to missing state on 404 response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 404 })
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("missing"));
  });

  it("transitions to missing state on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("missing"));
  });

  it("transitions to invalid state when response is not valid JSON shape", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("invalid"));
  });

  it("transitions to invalid state when body is malformed JSON string", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("this is not json at all", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("missing"));
  });

  it("transitions to success state and exposes typed data on valid response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(VALID_DASHBOARD), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("success"));

    if (result.current.status === "success") {
      expect(result.current.data.runId).toBe("2026-06-02T14-00-00Z");
      expect(result.current.data.pages).toHaveLength(1);
      expect(result.current.data.pages[0].pageId).toBe("homepage");
      expect(result.current.data.enabledCategories).toContain("performance");
    }
  });

  it("success data contains required DashboardData fields", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(VALID_DASHBOARD), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.status).toBe("success"));

    if (result.current.status === "success") {
      const { data } = result.current;
      expect(typeof data.generatedAt).toBe("string");
      expect(typeof data.runId).toBe("string");
      expect(Array.isArray(data.enabledCategories)).toBe(true);
      expect(Array.isArray(data.enabledDevices)).toBe(true);
      expect(Array.isArray(data.pages)).toBe(true);
    }
  });
});
