import { describe, expect, it } from "vitest";
import fixtureReport from "../../../fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json";
import { parseLighthouseReport } from "~/lib/lighthouse";
import {
  generateDashboardArtifacts,
  type GeneratorInputResult,
} from "~/lib/dashboard";
import { parseDashboardConfig, parsePageRegistry } from "~/lib/config";
import type { MetricStatus } from "~/lib/lighthouse";

const parsedConfig = parseDashboardConfig({
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  historyLimit: 3,
  basePath: "/eVitals/",
});

const parsedPages = parsePageRegistry([
  {
    id: "homepage",
    label: "Homepage",
    url: "https://www.ehealthinsurance.com/",
    group: "core",
  },
  {
    id: "medicare-part-b-giveback",
    label: "Medicare Part B Give-Back (Social Security)",
    url: "https://www.ehealthinsurance.com/medicare/managing-medicare/medicare-part-b-giveback-social-security/",
    group: "medicare",
  },
]);

if (!parsedConfig.success || !parsedPages.success) {
  throw new Error("Fixture validation failed");
}

const config = parsedConfig.data;
const pages = parsedPages.data;

type Profile = "good" | "needs-improvement" | "failing" | "run-failed";

function profilePatch(profile: Profile): {
  status: MetricStatus;
  metricStatuses: { lcp: MetricStatus; cls: MetricStatus; tbt: MetricStatus };
  categoryStatuses: Record<string, MetricStatus>;
  categoryScores: Record<string, number | null>;
  performanceScore: number | null;
  metrics: { lcp: number | null; cls: number | null; tbt: number | null; fcp: number | null; si: number | null };
} {
  if (profile === "good") {
    return {
      status: "pass",
      metricStatuses: { lcp: "pass", cls: "pass", tbt: "pass" },
      categoryStatuses: {
        performance: "pass",
        accessibility: "pass",
        "best-practices": "pass",
        seo: "pass",
      },
      categoryScores: {
        performance: 0.95,
        accessibility: 0.98,
        "best-practices": 0.96,
        seo: 0.99,
      },
      performanceScore: 0.95,
      metrics: { lcp: 1_800, cls: 0.08, tbt: 120, fcp: null, si: null },
    };
  }

  if (profile === "needs-improvement") {
    return {
      status: "needs-improvement",
      metricStatuses: {
        lcp: "needs-improvement",
        cls: "pass",
        tbt: "needs-improvement",
      },
      categoryStatuses: {
        performance: "needs-improvement",
        accessibility: "needs-improvement",
        "best-practices": "pass",
        seo: "pass",
      },
      categoryScores: {
        performance: 0.68,
        accessibility: 0.86,
        "best-practices": 0.9,
        seo: 0.94,
      },
      performanceScore: 0.68,
      metrics: { lcp: 3_200, cls: 0.08, tbt: 450, fcp: null, si: null },
    };
  }

  if (profile === "failing") {
    return {
      status: "fail",
      metricStatuses: { lcp: "fail", cls: "pass", tbt: "fail" },
      categoryStatuses: {
        performance: "fail",
        accessibility: "needs-improvement",
        "best-practices": "pass",
        seo: "pass",
      },
      categoryScores: {
        performance: 0.42,
        accessibility: 0.84,
        "best-practices": 0.89,
        seo: 0.95,
      },
      performanceScore: 0.42,
      metrics: { lcp: 4_300, cls: 0.11, tbt: 1_100, fcp: null, si: null },
    };
  }

  return {
    status: "run-failed",
    metricStatuses: { lcp: "run-failed", cls: "run-failed", tbt: "run-failed" },
    categoryStatuses: {
      performance: "run-failed",
      accessibility: "run-failed",
      "best-practices": "run-failed",
      seo: "run-failed",
    },
    categoryScores: {
      performance: null,
      accessibility: null,
      "best-practices": null,
      seo: null,
    },
    performanceScore: null,
    metrics: { lcp: null, cls: null, tbt: null, fcp: null, si: null },
  };
}

function makeResult(
  pageId: string,
  device: "mobile" | "desktop",
  runId: string,
  fetchTime: string,
  profile: Profile,
): GeneratorInputResult {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Unknown page ${pageId}`);

  const parsed = parseLighthouseReport(fixtureReport, {
    runId,
    enabledCategories: config.enabledCategories,
    reportJsonPath: `reports/runs/${runId}/${pageId}.${device}.report.json`,
    reportHtmlPath: `reports/runs/${runId}/${pageId}.${device}.report.html`,
  });

  return {
    pageId,
    result: {
      ...parsed,
      ...profilePatch(profile),
      runId,
      fetchTime,
      device,
      requestedUrl: page.url,
      finalUrl: page.url,
      reportJsonPath: `reports/runs/${runId}/${pageId}.${device}.report.json`,
      reportHtmlPath: `reports/runs/${runId}/${pageId}.${device}.report.html`,
    },
  };
}

function buildFixtureResults(): GeneratorInputResult[] {
  const latestRun = "2026-06-03T14-00-00Z";
  const previousRun = "2026-06-02T14-00-00Z";

  return [
    makeResult("homepage", "mobile", latestRun, "2026-06-03T14:00:01.000Z", "good"),
    makeResult("homepage", "desktop", latestRun, "2026-06-03T14:00:02.000Z", "failing"),
    makeResult(
      "medicare-part-b-giveback",
      "mobile",
      latestRun,
      "2026-06-03T14:00:03.000Z",
      "needs-improvement",
    ),
    makeResult(
      "medicare-part-b-giveback",
      "desktop",
      latestRun,
      "2026-06-03T14:00:04.000Z",
      "run-failed",
    ),
    makeResult("homepage", "mobile", previousRun, "2026-06-02T14:00:01.000Z", "needs-improvement"),
    makeResult("homepage", "desktop", previousRun, "2026-06-02T14:00:02.000Z", "good"),
    makeResult(
      "medicare-part-b-giveback",
      "mobile",
      previousRun,
      "2026-06-02T14:00:03.000Z",
      "failing",
    ),
    makeResult(
      "medicare-part-b-giveback",
      "desktop",
      previousRun,
      "2026-06-02T14:00:04.000Z",
      "needs-improvement",
    ),
  ];
}

describe("generateDashboardArtifacts contract", () => {
  it("builds dashboard summary/aggregates/status counts/priority/history from validated config + parsed mixed results", () => {
    const input = {
      config,
      pages,
      generatedAt: "2026-06-03T14:01:00.000Z",
      parsedResults: buildFixtureResults(),
    };

    const { dashboardData } = generateDashboardArtifacts(input);

    expect(dashboardData.runId).toBe("2026-06-03T14-00-00Z");
    expect(dashboardData.summary).toEqual({
      totalConfiguredPages: 2,
      totalConfiguredPageDevicePairs: 4,
      latestRunResultCount: 4,
      statusCounts: {
        good: 1,
        "needs-improvement": 1,
        failing: 1,
        "run-failed": 1,
      },
    });

    expect(dashboardData.aggregates.byCategory.performance.statusCounts).toEqual({
      good: 1,
      "needs-improvement": 1,
      failing: 1,
      "run-failed": 1,
    });

    expect(dashboardData.aggregates.byDevice.mobile.statusCounts).toEqual({
      good: 1,
      "needs-improvement": 1,
      failing: 0,
      "run-failed": 0,
    });

    expect(dashboardData.priority[0]).toMatchObject({
      pageId: "medicare-part-b-giveback",
      device: "desktop",
      status: "run-failed",
    });

    expect(dashboardData.priority[1]).toMatchObject({
      pageId: "homepage",
      device: "desktop",
      status: "failing",
    });

    expect(dashboardData.recentRunHistoryByPage.homepage).toHaveLength(3);
    expect(dashboardData.recentRunHistoryByPage.homepage[0].runId).toBe(
      "2026-06-03T14-00-00Z",
    );

    const latestHomepageMobile = dashboardData.pages
      .find((page) => page.pageId === "homepage")
      ?.results.mobile;

    expect(latestHomepageMobile).toMatchObject({
      status: "good",
      reportJsonPath:
        "reports/runs/2026-06-03T14-00-00Z/homepage.mobile.report.json",
      reportHtmlPath:
        "reports/runs/2026-06-03T14-00-00Z/homepage.mobile.report.html",
    });
  });

  it("builds per-run manifest entries with page/device/status/timestamp and preserved /reports/runs paths", () => {
    const { manifests } = generateDashboardArtifacts({
      config,
      pages,
      generatedAt: "2026-06-03T14:01:00.000Z",
      parsedResults: buildFixtureResults(),
    });

    expect(manifests.map((manifest) => manifest.runId)).toEqual([
      "2026-06-03T14-00-00Z",
      "2026-06-02T14-00-00Z",
    ]);

    const latestManifest = manifests[0];
    expect(latestManifest.results).toHaveLength(4);

    for (const entry of latestManifest.results) {
      expect(entry.pageId).toBeTypeOf("string");
      expect(entry.device).toMatch(/^(mobile|desktop)$/);
      expect(entry.status).toMatch(/^(good|needs-improvement|failing|run-failed)$/);
      expect(entry.fetchTime).toMatch(/^2026-06-03T14:00:0[1-4]\.000Z$/);
      expect(entry.reportJsonPath).toContain("reports/runs/2026-06-03T14-00-00Z/");
      expect(entry.reportHtmlPath).toContain("reports/runs/2026-06-03T14-00-00Z/");
      expect(entry.reportJsonPath.endsWith(".report.json")).toBe(true);
      expect(entry.reportHtmlPath.endsWith(".report.html")).toBe(true);
    }
  });

  it("is deterministic/pure for the same input", () => {
    const input = {
      config,
      pages,
      generatedAt: "2026-06-03T14:01:00.000Z",
      parsedResults: buildFixtureResults(),
    };

    const first = generateDashboardArtifacts(input);
    const second = generateDashboardArtifacts(input);

    expect(second).toEqual(first);
  });
});
