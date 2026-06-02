import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "~/routes/home";
import { DashboardFiltersProvider } from "~/lib/DashboardFiltersContext";
import { parseDashboardConfig, parsePageRegistry } from "~/lib/config";
import { parseLighthouseReport } from "~/lib/lighthouse";
import {
  generateDashboardArtifacts,
  type GeneratorInputResult,
} from "~/lib/dashboard";
import fixtureReport from "../../../fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json";

const configResult = parseDashboardConfig({
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  historyLimit: 30,
  basePath: "/eVitals/",
});

const pagesResult = parsePageRegistry([
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

if (!configResult.success || !pagesResult.success) {
  throw new Error("Fixture setup failed");
}

const config = configResult.data;
const pages = pagesResult.data;

function createParsedResult(
  pageId: string,
  device: "mobile" | "desktop",
  status: "pass" | "needs-improvement" | "fail" | "run-failed",
): GeneratorInputResult {
  const base = parseLighthouseReport(fixtureReport, {
    runId: "2026-06-03T14-00-00Z",
    enabledCategories: config.enabledCategories,
    reportJsonPath: `reports/runs/2026-06-03T14-00-00Z/${pageId}.${device}.report.json`,
    reportHtmlPath: `reports/runs/2026-06-03T14-00-00Z/${pageId}.${device}.report.html`,
  });

  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new Error(`Unknown page ${pageId}`);
  }

  return {
    pageId,
    result: {
      ...base,
      status,
      device,
      requestedUrl: page.url,
      finalUrl: page.url,
      fetchTime: "2026-06-03T14:00:01.000Z",
      reportJsonPath: `reports/runs/2026-06-03T14-00-00Z/${pageId}.${device}.report.json`,
      reportHtmlPath: `reports/runs/2026-06-03T14-00-00Z/${pageId}.${device}.report.html`,
    },
  };
}

describe("Home compatibility with generated dashboard output", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders latest generated dashboard data contract without crashing", async () => {
    const parsedResults: GeneratorInputResult[] = [
      createParsedResult("homepage", "mobile", "pass"),
      createParsedResult("homepage", "desktop", "fail"),
      createParsedResult("medicare-part-b-giveback", "mobile", "needs-improvement"),
      createParsedResult("medicare-part-b-giveback", "desktop", "run-failed"),
    ];

    const { dashboardData } = generateDashboardArtifacts({
      config,
      pages,
      parsedResults,
      generatedAt: "2026-06-03T14:01:00.000Z",
    });

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(dashboardData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <DashboardFiltersProvider config={config}>
        <Home />
      </DashboardFiltersProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });

    expect(screen.getByText("Most Recent Run")).toBeInTheDocument();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
    expect(screen.getAllByText("Medicare Part B Give-Back (Social Security)").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "View Report" }).length).toBeGreaterThan(0);
  });
});
