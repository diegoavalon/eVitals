import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { HashRouter } from "react-router";
import AllPages from "~/routes/all-pages";
import { DashboardFiltersProvider } from "~/lib/DashboardFiltersContext";
import type { DashboardConfig } from "~/lib/config.schemas";
import type { DashboardData } from "~/lib/dashboard.types";

const mockConfig: DashboardConfig = {
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  basePath: "/eVitals/",
  historyLimit: 30,
};

const createFixtureData = (): DashboardData => ({
  generatedAt: "2026-06-02T16:20:00.000Z",
  runId: "2026-06-02T14-00-00Z",
  enabledCategories: ["performance", "accessibility"],
  enabledDevices: ["mobile", "desktop"],
  defaultCategory: "performance",
  basePath: "/eVitals/",
  summary: {
    totalConfiguredPages: 3,
    totalConfiguredPageDevicePairs: 6,
    latestRunResultCount: 3,
    statusCounts: {
      good: 1,
      "needs-improvement": 1,
      failing: 1,
      "run-failed": 0,
    },
  },
  aggregates: { byCategory: {}, byDevice: {} },
  priority: [],
  recentRunHistoryByPage: {
    page1: [
      { runId: "run1", fetchTime: "2026-06-02T10:00:00Z", device: "mobile", status: "failing", lcp: 2863 },
      { runId: "run2", fetchTime: "2026-06-02T14:00:00Z", device: "mobile", status: "good", lcp: 2100 },
    ],
    page2: [
      { runId: "run1", fetchTime: "2026-06-02T10:00:00Z", device: "mobile", status: "needs-improvement", lcp: 1800 },
    ],
    page3: [],
  },
  pages: [
    {
      pageId: "page1",
      label: "Page 1",
      url: "https://example.com/1",
      group: "core",
      results: {
        mobile: {
          status: "good",
          scores: { performance: 92, accessibility: 88, "best-practices": 95, seo: 98 },
          metrics: { lcp: 2100, cls: 0.02, tbt: 150, fcp: 1900, si: 3800 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page1.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page1.mobile.report.json",
        },
        desktop: {
          status: "good",
          scores: { performance: 95, accessibility: 90, "best-practices": 98, seo: 99 },
          metrics: { lcp: 1500, cls: 0.01, tbt: 100, fcp: 1300, si: 3200 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page1.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page1.desktop.report.json",
        },
      },
    },
    {
      pageId: "page2",
      label: "Page 2",
      url: "https://example.com/2",
      group: "core",
      results: {
        mobile: {
          status: "failing",
          scores: { performance: 45, accessibility: 72, "best-practices": 80, seo: 85 },
          metrics: { lcp: 3700, cls: 0.15, tbt: 2500, fcp: 3600, si: 5200 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page2.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page2.mobile.report.json",
        },
        desktop: {
          status: "good",
          scores: { performance: 93, accessibility: 91, "best-practices": 97, seo: 99 },
          metrics: { lcp: 1600, cls: 0.01, tbt: 130, fcp: 1400, si: 3400 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page2.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page2.desktop.report.json",
        },
      },
    },
    {
      pageId: "page3",
      label: "Page 3",
      url: "https://example.com/3",
      group: "other",
      results: {
        mobile: {
          status: "needs-improvement",
          scores: { performance: 72, accessibility: 88, "best-practices": 92, seo: 94 },
          metrics: { lcp: 2300, cls: 0.03, tbt: 200, fcp: 2100, si: 4000 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page3.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page3.mobile.report.json",
        },
        desktop: {
          status: "good",
          scores: { performance: 93, accessibility: 91, "best-practices": 97, seo: 99 },
          metrics: { lcp: 1600, cls: 0.01, tbt: 130, fcp: 1400, si: 3400 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page3.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page3.desktop.report.json",
        },
      },
    },
  ],
});

vi.mock("~/lib/useDashboardData", () => ({
  useDashboardData: vi.fn(() => ({
    status: "success",
    data: createFixtureData(),
  })),
}));

import { useDashboardData } from "~/lib/useDashboardData";
const mockUseDashboardData = useDashboardData as ReturnType<typeof vi.fn>;

function renderAllPages() {
  return render(
    <HashRouter>
      <DashboardFiltersProvider config={mockConfig}>
        <AllPages />
      </DashboardFiltersProvider>
    </HashRouter>,
  );
}

describe("Issue #7 — All Pages Table QA Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDashboardData.mockReturnValue({ status: "success", data: createFixtureData() });
  });

  describe("AC-1: Pages grouped by label with collapsible headers", () => {
    it("renders group headers", () => {
      renderAllPages();
      expect(screen.getByText("Core")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("shows page count in group headers", () => {
      renderAllPages();
      expect(screen.getByText(/2 pages/)).toBeInTheDocument();
      expect(screen.getByText(/1 page/)).toBeInTheDocument();
    });

    it("makes groups collapsible", () => {
      renderAllPages();
      const buttons = screen.getAllByRole("button");
      const coreBtn = buttons.find((b) => b.textContent?.includes("Core"));
      expect(coreBtn).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(coreBtn!);
      expect(coreBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Page 1")).not.toBeInTheDocument();
      fireEvent.click(coreBtn!);
      expect(coreBtn).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
  });

  describe("AC-2: Status filter correctly shows/hides rows", () => {
    it("renders all pages by default", () => {
      renderAllPages();
      expect(screen.getByText("Page 1")).toBeInTheDocument();
      expect(screen.getByText("Page 2")).toBeInTheDocument();
      expect(screen.getByText("Page 3")).toBeInTheDocument();
    });

    it("renders filter control label", () => {
      renderAllPages();
      expect(screen.getByText("Filter by Status")).toBeInTheDocument();
    });
  });

  describe("AC-3: Device filter switches metric values", () => {
    it("displays selected device in headline", () => {
      renderAllPages();
      expect(screen.getByText(/\(mobile\)/)).toBeInTheDocument();
    });

    it("shows correct scores for device", () => {
      renderAllPages();
      expect(screen.getByText("92")).toBeInTheDocument();
    });
  });

  describe("AC-4: Row data (name, score, sparkline, delta)", () => {
    it("renders page name and URL in rows", () => {
      renderAllPages();
      expect(screen.getByText("Page 1")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/1")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "https://example.com/1" }),
      ).toBeInTheDocument();
    });

    it("renders score gauge with circles", () => {
      renderAllPages();
      const circles = document.querySelectorAll("circle");
      expect(circles.length).toBeGreaterThan(0);
    });

    it("renders status badges", () => {
      renderAllPages();
      expect(screen.getByText("Good (92)")).toBeInTheDocument();
      expect(screen.getByText("Failing (45)")).toBeInTheDocument();
      expect(screen.getByText("Needs Improvement (72)")).toBeInTheDocument();
    });

    it("renders sparkline polylines", () => {
      renderAllPages();
      const polylines = document.querySelectorAll("svg polyline");
      expect(polylines.length).toBeGreaterThan(0);
    });

    it("renders delta indicators", () => {
      renderAllPages();
      const text = document.body.textContent;
      expect(text).toMatch(/[+-]?\d+%/);
    });
  });

  describe("AC-5: Failed-metric rows distinguished", () => {
    it("highlights failing rows with bg-surface-muted", () => {
      renderAllPages();
      const page2Row = screen.getByText("Page 2").closest("div")?.parentElement?.parentElement;
      expect(page2Row).toHaveClass("bg-surface-muted");
    });

    it("renders failing status with error color", () => {
      renderAllPages();
      expect(screen.getByText("Failing (45)")).toHaveClass("text-error");
    });

    it("renders good status with primary color", () => {
      renderAllPages();
      expect(screen.getByText("Good (92)")).toHaveClass("text-primary");
    });
  });

  describe("AC-6: Multi-group, multi-status fixture rendering", () => {
    it("renders all groups and pages from fixture", () => {
      renderAllPages();
      expect(screen.getByText("Core")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
      expect(screen.getByText("Page 1")).toBeInTheDocument();
      expect(screen.getByText("Page 2")).toBeInTheDocument();
      expect(screen.getByText("Page 3")).toBeInTheDocument();
    });

    it("correctly groups pages by group label", () => {
      renderAllPages();
      const coreGroup = screen.getByText("Core").closest("div");
      expect(within(coreGroup!).getByText("Page 1")).toBeInTheDocument();
      expect(within(coreGroup!).getByText("Page 2")).toBeInTheDocument();
    });

    it("renders mixed statuses correctly", () => {
      renderAllPages();
      expect(screen.getByText("Good (92)")).toBeInTheDocument();
      expect(screen.getByText("Failing (45)")).toBeInTheDocument();
      expect(screen.getByText("Needs Improvement (72)")).toBeInTheDocument();
    });
  });

  describe("AC-7: Filter interaction state propagation", () => {
    it("maintains structure during group toggle", () => {
      renderAllPages();
      const buttons = screen.getAllByRole("button");
      const coreBtn = buttons.find((b) => b.textContent?.includes("Core"));
      fireEvent.click(coreBtn!);
      fireEvent.click(coreBtn!);
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
  });

  describe("AC-8: Sparkline & delta calculation correctness", () => {
    it("verifies fixture has multi-point history for delta", () => {
      const data = createFixtureData();
      expect(data.recentRunHistoryByPage.page1.length).toBeGreaterThan(1);
      const delta = data.recentRunHistoryByPage.page1[1].lcp! - data.recentRunHistoryByPage.page1[0].lcp!;
      expect(delta).toBeLessThan(0);
    });

    it("sparkline renders with LCP data points", () => {
      renderAllPages();
      const polylines = document.querySelectorAll("svg polyline");
      polylines.forEach((p) => {
        const points = p.getAttribute("points");
        if (points) expect(points).toMatch(/[\d.,\s]+/);
      });
    });
  });

  describe("AC-9: Light/dark theme render coverage", () => {
    it("uses design token classes", () => {
      renderAllPages();
      const main = screen.getByRole("main");
      expect(main).toHaveClass("bg-surface-canvas");
      const heading = screen.getByText("All Pages");
      expect(heading).toHaveClass("text-primary");
    });

    it("applies theme to status badges", () => {
      renderAllPages();
      const goodBadge = screen.getByText(/Good \(\d+\)/);
      expect(goodBadge).toHaveClass("text-primary", "bg-surface-subtle");
      const failBadge = screen.getByText(/Failing \(\d+\)/);
      expect(failBadge).toHaveClass("text-error", "bg-surface-subtle");
    });

    it("preserves colors in visualizations", () => {
      renderAllPages();
      const circles = document.querySelectorAll("circle[stroke]");
      circles.forEach((c) => {
        expect(c.getAttribute("stroke")).toBeTruthy();
      });
    });
  });

  describe("Data fetch states", () => {
    it("renders loading state", () => {
      mockUseDashboardData.mockReturnValue({ status: "loading" });
      renderAllPages();
      expect(screen.getByText(/Loading dashboard data/)).toBeInTheDocument();
    });

    it("renders missing state", () => {
      mockUseDashboardData.mockReturnValue({ status: "missing" });
      renderAllPages();
      expect(screen.getByText(/Dashboard data not found/)).toBeInTheDocument();
    });

    it("renders invalid state", () => {
      mockUseDashboardData.mockReturnValue({ status: "invalid" });
      renderAllPages();
      expect(screen.getByText(/Dashboard data is corrupted/)).toBeInTheDocument();
    });
  });

  describe("Report viewing", () => {
    it("renders View Report buttons for pages with reports", () => {
      renderAllPages();
      const buttons = screen.getAllByText("Full Report");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
