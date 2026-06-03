import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter } from "react-router";
import AllPages from "~/routes/all-pages";
import { DashboardFiltersProvider } from "~/lib/DashboardFiltersContext";
import type { DashboardConfig } from "~/lib/config.schemas";

const mockConfig: DashboardConfig = {
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  basePath: "/eVitals/",
  historyLimit: 30,
};

// Mock dashboard data
const mockDashboardData = {
  generatedAt: "2026-06-02T16:20:00.000Z",
  runId: "2026-06-02T14-00-00Z",
  enabledCategories: ["performance", "accessibility"],
  enabledDevices: ["mobile", "desktop"],
  defaultCategory: "performance",
  basePath: "/eVitals/",
  summary: {
    totalConfiguredPages: 3,
    totalConfiguredPageDevicePairs: 6,
    latestRunResultCount: 2,
    statusCounts: {
      good: 1,
      "needs-improvement": 1,
      failing: 1,
      "run-failed": 3,
    },
  },
  aggregates: {
    byCategory: {
      performance: {
        statusCounts: { good: 0, "needs-improvement": 0, failing: 1, "run-failed": 3 },
        averageScore: 60,
        successfulCount: 1,
        totalCount: 4,
      },
    },
    byDevice: {
      mobile: {
        statusCounts: { good: 0, "needs-improvement": 0, failing: 1, "run-failed": 1 },
        averageScore: 60,
        successfulCount: 1,
        totalCount: 2,
      },
      desktop: {
        statusCounts: { good: 0, "needs-improvement": 0, failing: 0, "run-failed": 2 },
        averageScore: null,
        successfulCount: 0,
        totalCount: 2,
      },
    },
  },
  priority: [],
  recentRunHistoryByPage: {
    page1: [
      { runId: "run1", fetchTime: "2026-06-02T16:19:41.855Z", device: "mobile", status: "failing", lcp: 2863 },
      { runId: "run2", fetchTime: "2026-06-01T16:19:41.855Z", device: "mobile", status: "failing", lcp: 3500 },
    ],
    page2: [
      { runId: "run1", fetchTime: "2026-06-02T16:19:41.855Z", device: "mobile", status: "needs-improvement", lcp: 1800 },
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
          status: "failing",
          scores: { performance: 60, accessibility: 88, "best-practices": 100, seo: 100 },
          metrics: { lcp: 2863, cls: 0.02, tbt: 2040, fcp: 2852, si: 4414 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page1.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page1.mobile.report.json",
        },
        desktop: {
          status: "run-failed",
          scores: { performance: 0, accessibility: 0, "best-practices": 0, seo: 0 },
          metrics: { lcp: null, cls: null, tbt: null, fcp: null, si: null },
          reportHtmlPath: "",
          reportJsonPath: "",
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
          status: "needs-improvement",
          scores: { performance: 75, accessibility: 92, "best-practices": 100, seo: 100 },
          metrics: { lcp: 1800, cls: 0.01, tbt: 150, fcp: 1700, si: 3200 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page2.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page2.mobile.report.json",
        },
        desktop: {
          status: "run-failed",
          scores: { performance: 0, accessibility: 0, "best-practices": 0, seo: 0 },
          metrics: { lcp: null, cls: null, tbt: null, fcp: null, si: null },
          reportHtmlPath: "",
          reportJsonPath: "",
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
          status: "good",
          scores: { performance: 95, accessibility: 100, "best-practices": 100, seo: 100 },
          metrics: { lcp: 1500, cls: 0.005, tbt: 50, fcp: 1400, si: 2800 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page3.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page3.mobile.report.json",
        },
        desktop: {
          status: "good",
          scores: { performance: 96, accessibility: 100, "best-practices": 100, seo: 100 },
          metrics: { lcp: 1400, cls: 0.002, tbt: 30, fcp: 1300, si: 2600 },
          reportHtmlPath: "reports/runs/2026-06-02T14-00-00Z/page3.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-02T14-00-00Z/page3.desktop.report.json",
        },
      },
    },
  ],
};

vi.mock("~/lib/useDashboardData", () => ({
  useDashboardData: () => ({ status: "success", data: mockDashboardData }),
}));

function renderAllPages() {
  return render(
    <HashRouter>
      <DashboardFiltersProvider config={mockConfig}>
        <AllPages />
      </DashboardFiltersProvider>
    </HashRouter>,
  );
}

describe("All Pages Component — Issue #7", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-1: Page Grouping", () => {
    it("should group pages by configured group label", () => {
      renderAllPages();
      const coreHeader = screen.getByText("Core");
      const otherHeader = screen.getByText("Other");
      expect(coreHeader).toBeInTheDocument();
      expect(otherHeader).toBeInTheDocument();
    });

    it("should display collapsible group headers with page count", () => {
      renderAllPages();
      const coreSection = screen.getByText("Core").closest("button");
      expect(within(coreSection!).getByText(/2 page/)).toBeInTheDocument();
      const otherSection = screen.getByText("Other").closest("button");
      expect(within(otherSection!).getByText(/1 page/)).toBeInTheDocument();
    });

    it("makes groups collapsible", async () => {
      renderAllPages();
      const user = userEvent.setup();
      const coreHeader = screen.getByText("Core");
      const coreButton = coreHeader.closest("button")!;
      expect(coreButton).toHaveAttribute("aria-expanded", "true");
      await user.click(coreButton);
      expect(coreButton).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Page 1")).not.toBeInTheDocument();
      await user.click(coreButton);
      expect(coreButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
  });

  describe("AC-4: Row Components", () => {
    it("should display page name and URL in each row", () => {
      renderAllPages();
      expect(screen.getByText("Page 1")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/1")).toBeInTheDocument();
      expect(screen.getByText("Page 3")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/3")).toBeInTheDocument();
    });

    it("should display current score as score gauge", () => {
      renderAllPages();
      expect(screen.getByText("Failing (60)")).toBeInTheDocument();
      expect(screen.getByText("Good (95)")).toBeInTheDocument();
    });

    it("should display status badge for each row", () => {
      renderAllPages();
      expect(screen.getByText("Failing (60)")).toBeInTheDocument();
      expect(screen.getByText("Needs Improvement (75)")).toBeInTheDocument();
      expect(screen.getByText("Good (95)")).toBeInTheDocument();
    });

    it("should provide Full Report button for pages with report data", () => {
      renderAllPages();
      const reportButtons = screen.getAllByText("Full Report");
      expect(reportButtons.length).toBeGreaterThan(0);
    });
  });

  describe("AC-7: Failed Metric Visual Distinction", () => {
    it("should visually distinguish rows with failing status", () => {
      renderAllPages();
      const page1Label = screen.getByText("Page 1");
      const page1Row = page1Label.closest("div")?.parentElement?.parentElement;
      expect(page1Row).toHaveClass("bg-surface-muted");
    });

    it("should not highlight rows with good status", () => {
      renderAllPages();
      const page3Label = screen.getByText("Page 3");
      const page3Row = page3Label.closest("div")?.parentElement?.parentElement;
      expect(page3Row).not.toHaveClass("bg-surface-muted");
    });
  });

  describe("AC-8: Theme Support", () => {
    it("should apply design token classes correctly", () => {
      renderAllPages();
      const headline = screen.getByText("All Pages");
      expect(headline).toHaveClass("font-poppins", "font-bold", "text-primary");
    });

    it("should use design system colors for status badges", () => {
      renderAllPages();
      const failingBadge = screen.getByText("Failing (60)");
      expect(failingBadge).toHaveClass("text-error");
      const goodBadge = screen.getByText("Good (95)");
      expect(goodBadge).toHaveClass("text-primary");
    });
  });

  describe("Loading States", () => {
    it("should handle success state with data", () => {
      renderAllPages();
      expect(screen.getByText("All Pages")).toBeInTheDocument();
      expect(screen.getByText(/Audit results for 3 configured pages/)).toBeInTheDocument();
    });
  });
});
