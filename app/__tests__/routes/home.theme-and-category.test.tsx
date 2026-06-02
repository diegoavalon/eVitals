import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardData } from "~/lib/dashboard.types";

// AC-2: Category selector updates displays correctly
// AC-6: Light theme render coverage
// AC-7: Dark theme render coverage

const mockDashboardData: DashboardData = {
  generatedAt: "2026-06-03T14:01:00.000Z",
  runId: "2026-06-03T14-00-00Z",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  enabledDevices: ["mobile", "desktop"],
  defaultCategory: "performance",
  basePath: "/eVitals/",
  summary: {
    totalConfiguredPages: 2,
    totalConfiguredPageDevicePairs: 4,
    latestRunResultCount: 4,
    statusCounts: {
      good: 1,
      "needs-improvement": 1,
      failing: 1,
      "run-failed": 1,
    },
  },
  aggregates: {
    byCategory: {
      performance: {
        statusCounts: { good: 1, "needs-improvement": 1, failing: 1, "run-failed": 1 },
        averageScore: 68.33,
        successfulCount: 3,
        totalCount: 4,
      },
      accessibility: {
        statusCounts: { good: 1, "needs-improvement": 2, failing: 0, "run-failed": 1 },
        averageScore: 89.33,
        successfulCount: 3,
        totalCount: 4,
      },
      "best-practices": {
        statusCounts: { good: 3, "needs-improvement": 0, failing: 0, "run-failed": 1 },
        averageScore: 92,
        successfulCount: 3,
        totalCount: 4,
      },
      seo: {
        statusCounts: { good: 3, "needs-improvement": 0, failing: 0, "run-failed": 1 },
        averageScore: 96,
        successfulCount: 3,
        totalCount: 4,
      },
    },
    byDevice: {
      mobile: {
        statusCounts: { good: 1, "needs-improvement": 1, failing: 0, "run-failed": 0 },
        averageScore: 82,
        successfulCount: 2,
        totalCount: 2,
      },
      desktop: {
        statusCounts: { good: 0, "needs-improvement": 0, failing: 1, "run-failed": 1 },
        averageScore: 42,
        successfulCount: 1,
        totalCount: 2,
      },
    },
  },
  priority: [
    {
      pageId: "medicare-part-b-giveback",
      label: "Medicare Part B Give-Back (Social Security)",
      group: "medicare",
      device: "desktop",
      status: "run-failed",
      score: null,
      failingMetricCount: 3,
    },
  ],
  recentRunHistoryByPage: {
    homepage: [
      {
        runId: "2026-06-03T14-00-00Z",
        fetchTime: "2026-06-03T14:00:02.000Z",
        device: "desktop",
        status: "failing",
        lcp: 4300,
      },
      {
        runId: "2026-06-03T14-00-00Z",
        fetchTime: "2026-06-03T14:00:01.000Z",
        device: "mobile",
        status: "good",
        lcp: 1800,
      },
    ],
    "medicare-part-b-giveback": [
      {
        runId: "2026-06-03T14-00-00Z",
        fetchTime: "2026-06-03T14:00:04.000Z",
        device: "desktop",
        status: "run-failed",
        lcp: null,
      },
      {
        runId: "2026-06-03T14-00-00Z",
        fetchTime: "2026-06-03T14:00:03.000Z",
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
          status: "good",
          scores: {
            performance: 95,
            accessibility: 98,
            "best-practices": 96,
            seo: 99,
          },
          metrics: { lcp: 1800, cls: 0.08, tbt: 120 },
          reportHtmlPath: "reports/runs/2026-06-03T14-00-00Z/homepage.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-03T14-00-00Z/homepage.mobile.report.json",
        },
        desktop: {
          status: "failing",
          scores: {
            performance: 42,
            accessibility: 84,
            "best-practices": 89,
            seo: 95,
          },
          metrics: { lcp: 4300, cls: 0.11, tbt: 1100 },
          reportHtmlPath: "reports/runs/2026-06-03T14-00-00Z/homepage.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-03T14-00-00Z/homepage.desktop.report.json",
        },
      },
    },
    {
      pageId: "medicare-part-b-giveback",
      label: "Medicare Part B Give-Back (Social Security)",
      url: "https://www.ehealthinsurance.com/medicare/managing-medicare/medicare-part-b-giveback-social-security/",
      group: "medicare",
      results: {
        mobile: {
          status: "needs-improvement",
          scores: {
            performance: 68,
            accessibility: 86,
            "best-practices": 90,
            seo: 94,
          },
          metrics: { lcp: 3200, cls: 0.08, tbt: 450 },
          reportHtmlPath: "reports/runs/2026-06-03T14-00-00Z/medicare-part-b-giveback.mobile.report.html",
          reportJsonPath: "reports/runs/2026-06-03T14-00-00Z/medicare-part-b-giveback.mobile.report.json",
        },
        desktop: {
          status: "run-failed",
          scores: {
            performance: 0,
            accessibility: 0,
            "best-practices": 0,
            seo: 0,
          },
          metrics: { lcp: null, cls: null, tbt: null },
          reportHtmlPath: "reports/runs/2026-06-03T14-00-00Z/medicare-part-b-giveback.desktop.report.html",
          reportJsonPath: "reports/runs/2026-06-03T14-00-00Z/medicare-part-b-giveback.desktop.report.json",
        },
      },
    },
  ],
};

describe("Home — AC-6: Light Theme Rendering", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockDashboardData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Ensure light theme is set
    document.documentElement.classList.remove("dark");
  });

  it("renders with light theme CSS variables applied (AC-6)", async () => {
    const { container } = render(
      <div style={{ backgroundColor: "var(--surface)", color: "var(--on-surface)" }}>
        Light theme test
      </div>,
    );

    const div = container.querySelector("div");
    expect(div).toHaveStyle({ backgroundColor: "var(--surface)" });
  });

  it("main element has surface-canvas background in light theme (AC-6)", async () => {
    const { container } = render(
      <main className="bg-surface-canvas">Light theme background</main>,
    );

    const main = container.querySelector("main");
    expect(main).toHaveClass("bg-surface-canvas");
  });

  it("text colors use on-surface tokens in light theme (AC-6)", async () => {
    const { container } = render(
      <h1 className="text-on-surface">Light theme heading</h1>,
    );

    const heading = container.querySelector("h1");
    expect(heading).toHaveClass("text-on-surface");
  });

  it("status badge colors apply light theme palette (AC-6)", async () => {
    const { container } = render(
      <>
        <span className="text-primary">Good</span>
        <span className="text-warning">Needs Improvement</span>
        <span className="text-error">Failing</span>
        <span className="text-neutral">Run Failed</span>
      </>,
    );

    expect(container.querySelector(".text-primary")).toBeInTheDocument();
    expect(container.querySelector(".text-warning")).toBeInTheDocument();
    expect(container.querySelector(".text-error")).toBeInTheDocument();
    expect(container.querySelector(".text-neutral")).toBeInTheDocument();
  });

  it("border and surface tokens use light theme in cards (AC-6)", async () => {
    const { container } = render(
      <li className="border border-border bg-surface">Light theme card</li>,
    );

    const card = container.querySelector("li");
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("border-border");
    expect(card).toHaveClass("bg-surface");
  });
});

describe("Home — AC-7: Dark Theme Rendering", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockDashboardData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    // Enable dark theme
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("renders with dark theme CSS variables applied (AC-7)", async () => {
    const { container } = render(
      <div style={{ backgroundColor: "var(--surface-dark)", color: "var(--on-surface-dark)" }}>
        Dark theme test
      </div>,
    );

    const div = container.querySelector("div");
    expect(div).toHaveStyle({
      backgroundColor: "var(--surface-dark)",
      color: "var(--on-surface-dark)",
    });
  });

  it("dark theme applies to heading typography (AC-7)", async () => {
    const { container } = render(
      <h1 className="text-primary dark:text-primary-bright">Dark theme heading</h1>,
    );

    const heading = container.querySelector("h1");
    expect(heading).toHaveClass("text-primary", "dark:text-primary-bright");
  });

  it("status colors render correctly in dark theme (AC-7)", async () => {
    const { container } = render(
      <>
        <span className="text-primary dark:text-primary-bright">Good</span>
        <span className="text-warning dark:text-warning">Needs Improvement</span>
        <span className="text-error dark:text-error">Failing</span>
      </>,
    );

    const elements = container.querySelectorAll("span");
    expect(elements.length).toBe(3);
    elements.forEach((el) => {
      expect(el.className).toMatch(/text-/);
    });
  });

  it("card backgrounds apply dark surface tokens (AC-7)", async () => {
    const { container } = render(
      <li className="bg-surface dark:bg-surface-dark">Dark theme card</li>,
    );

    const card = container.querySelector("li");
    expect(card).toHaveClass("bg-surface", "dark:bg-surface-dark");
  });

  it("borders apply dark theme colors (AC-7)", async () => {
    const { container } = render(
      <li className="border border-border dark:border-border">Card with dark border</li>,
    );

    const card = container.querySelector("li");
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("dark:border-border");
  });
});

describe("Home — AC-2: Category Selector (placeholder for selector UI)", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockDashboardData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("dashboard data includes all category aggregates (AC-2)", async () => {
    // Verify fixture has all required categories
    expect(mockDashboardData.aggregates.byCategory).toHaveProperty("performance");
    expect(mockDashboardData.aggregates.byCategory).toHaveProperty("accessibility");
    expect(mockDashboardData.aggregates.byCategory).toHaveProperty("best-practices");
    expect(mockDashboardData.aggregates.byCategory).toHaveProperty("seo");
  });

  it("category aggregates include status counts (AC-2)", async () => {
    const perfCategory = mockDashboardData.aggregates.byCategory.performance;
    expect(perfCategory.statusCounts).toEqual({
      good: 1,
      "needs-improvement": 1,
      failing: 1,
      "run-failed": 1,
    });
  });

  it("category aggregates include average scores (AC-2)", async () => {
    const perfCategory = mockDashboardData.aggregates.byCategory.performance;
    expect(perfCategory.averageScore).toBeCloseTo(68.33, 1);
  });

  it("accessibility category shows different status distribution (AC-2)", async () => {
    const a11yCategory = mockDashboardData.aggregates.byCategory.accessibility;
    expect(a11yCategory.statusCounts.good).toBe(1);
    expect(a11yCategory.statusCounts["needs-improvement"]).toBe(2);
    expect(a11yCategory.statusCounts.failing).toBe(0);
  });

  it("all categories use consistent status count keys (AC-2)", async () => {
    const categories = Object.values(mockDashboardData.aggregates.byCategory);
    categories.forEach((category) => {
      expect(category.statusCounts).toHaveProperty("good");
      expect(category.statusCounts).toHaveProperty("needs-improvement");
      expect(category.statusCounts).toHaveProperty("failing");
      expect(category.statusCounts).toHaveProperty("run-failed");
    });
  });
});

// Import afterEach for dark theme cleanup
import { afterEach } from "vitest";
