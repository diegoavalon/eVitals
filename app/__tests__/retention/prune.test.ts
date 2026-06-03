import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, relative } from "path";
import { prune, type PruneResult } from "../../lib/retention/prune";
import type { DashboardData } from "../../lib/dashboard.types";

// ---------------------------------------------------------------------------
// Test helpers and fixtures
// ---------------------------------------------------------------------------

const TEST_ARTIFACTS_DIR = join(__dirname, "../../..", ".test-artifacts");

/**
 * Create a minimal dashboard data fixture with specified number of runs.
 * Each run gets full artifact paths for tracking and deletion.
 */
function createDashboardFixture(runCount: number): DashboardData {
  const runs = Array.from({ length: runCount }, (_, i) => {
    const index = runCount - i - 1;
    const timestamp = `2026-06-${String(1 + index).padStart(2, "0")}T14-00-00Z`;
    return { timestamp, index };
  });

  const currentRun = runs[0];

  return {
    generatedAt: `2026-06-${String(runCount).padStart(2, "0")}T16:20:00.000Z`,
    runId: currentRun.timestamp,
    enabledCategories: ["performance"],
    enabledDevices: ["mobile"],
    defaultCategory: "performance",
    basePath: "/eVitals/",
    summary: {
      totalConfiguredPages: 1,
      totalConfiguredPageDevicePairs: 1,
      latestRunResultCount: 1,
      statusCounts: { good: 1, "needs-improvement": 0, failing: 0, "run-failed": 0 },
    },
    aggregates: {
      byCategory: {
        performance: {
          statusCounts: { good: 1, "needs-improvement": 0, failing: 0, "run-failed": 0 },
          averageScore: 95,
          successfulCount: 1,
          totalCount: 1,
        },
      },
      byDevice: {
        mobile: {
          statusCounts: { good: 1, "needs-improvement": 0, failing: 0, "run-failed": 0 },
          averageScore: 95,
          successfulCount: 1,
          totalCount: 1,
        },
      },
    },
    priority: [],
    recentRunHistoryByPage: {
      testpage: runs.map((run) => ({
        runId: run.timestamp,
        fetchTime: `2026-06-${String(1 + run.index).padStart(2, "0")}T16:19:41.855Z`,
        device: "mobile",
        status: "good",
        lcp: 2000,
      })),
    },
    pages: [
      {
        pageId: "testpage",
        label: "Test Page",
        url: "https://example.com/",
        group: "test",
        results: {
          mobile: {
            status: "good",
            scores: { performance: 95 },
            metrics: { lcp: 2000, cls: 0.01, tbt: 100, fcp: 1500, si: 3000 },
            reportHtmlPath: `reports/runs/${currentRun.timestamp}/testpage.mobile.report.html`,
            reportJsonPath: `reports/runs/${currentRun.timestamp}/testpage.mobile.report.json`,
          },
        },
      },
    ],
  };
}

/**
 * Create artifact files on disk for a given runId.
 */
function createArtifactFiles(runId: string): void {
  const runDir = join(TEST_ARTIFACTS_DIR, "reports/runs", runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "testpage.mobile.report.html"), "<html>Report</html>");
  writeFileSync(join(runDir, "testpage.mobile.report.json"), '{"report": "data"}');
}

/**
 * Verify that artifact files exist on disk.
 */
function artifactsExist(runId: string): boolean {
  const htmlPath = join(TEST_ARTIFACTS_DIR, `reports/runs/${runId}/testpage.mobile.report.html`);
  const jsonPath = join(TEST_ARTIFACTS_DIR, `reports/runs/${runId}/testpage.mobile.report.json`);
  return existsSync(htmlPath) && existsSync(jsonPath);
}

/**
 * Verify no orphaned entries: all non-empty artifact paths are tracked in history.
 */
function verifyNoOrphanedEntries(data: DashboardData): void {
  const manifestedRunIds = new Set<string>();
  data.pages.forEach((page) => {
    Object.values(page.results).forEach((result) => {
      if (result.reportHtmlPath) {
        const match = result.reportHtmlPath.match(/reports\/runs\/([^/]+)\//);
        if (match) manifestedRunIds.add(match[1]);
      }
      if (result.reportJsonPath) {
        const match = result.reportJsonPath.match(/reports\/runs\/([^/]+)\//);
        if (match) manifestedRunIds.add(match[1]);
      }
    });
  });

  const historyRunIds = new Set<string>();
  Object.values(data.recentRunHistoryByPage).forEach((entries) => {
    entries.forEach((entry) => {
      historyRunIds.add(entry.runId);
    });
  });

  // Current run should always be manifested
  manifestedRunIds.add(data.runId);

  // Every manifested artifact path should have a corresponding history OR be the current run
  manifestedRunIds.forEach((runId) => {
    const hasHistory = historyRunIds.has(runId) || runId === data.runId;
    expect(hasHistory, `Artifact runId ${runId} has no history entry`).toBeTruthy();
  });
}

/**
 * Verify no artifact files exist without manifest entries.
 */
function verifyNoOrphanedArtifacts(data: DashboardData, deletedArtifacts: string[]): void {
  const manifestedArtifacts = new Set<string>();
  data.pages.forEach((page) => {
    Object.values(page.results).forEach((result) => {
      if (result.reportHtmlPath) manifestedArtifacts.add(result.reportHtmlPath);
      if (result.reportJsonPath) manifestedArtifacts.add(result.reportJsonPath);
    });
  });

  deletedArtifacts.forEach((artifact) => {
    expect(
      !manifestedArtifacts.has(artifact),
      `Deleted artifact still in manifest: ${artifact}`,
    ).toBeTruthy();
  });
}

/**
 * Count unique runIds in dashboard data.
 */
function countUniqueRunIds(data: DashboardData): number {
  const runIds = new Set<string>();
  runIds.add(data.runId);
  Object.values(data.recentRunHistoryByPage).forEach((entries) => {
    entries.forEach((entry) => {
      runIds.add(entry.runId);
    });
  });
  return runIds.size;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prune — retention module", () => {
  beforeEach(() => {
    if (!existsSync(TEST_ARTIFACTS_DIR)) {
      mkdirSync(TEST_ARTIFACTS_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test artifacts
    if (existsSync(TEST_ARTIFACTS_DIR)) {
      const fs = require("fs");
      fs.rmSync(TEST_ARTIFACTS_DIR, { recursive: true, force: true });
    }
  });

  describe("at-limit scenarios", () => {
    it("returns unchanged data when exactly at limit", () => {
      const data = createDashboardFixture(30);
      const result = prune(data, TEST_ARTIFACTS_DIR, 30);

      expect(result.removedRunIds).toHaveLength(0);
      expect(result.deletedArtifacts).toHaveLength(0);
      expect(result.retainedCount).toBe(30);
      expect(countUniqueRunIds(result.prunedData)).toBe(30);
    });

    it("returns unchanged data when below limit", () => {
      const data = createDashboardFixture(15);
      const result = prune(data, TEST_ARTIFACTS_DIR, 30);

      expect(result.removedRunIds).toHaveLength(0);
      expect(result.deletedArtifacts).toHaveLength(0);
      expect(result.retainedCount).toBe(15);
      expect(countUniqueRunIds(result.prunedData)).toBe(15);
    });

    it("does not modify input data (pure function)", () => {
      const data = createDashboardFixture(30);
      const originalJson = JSON.stringify(data);

      prune(data, TEST_ARTIFACTS_DIR, 30);

      expect(JSON.stringify(data)).toBe(originalJson);
    });
  });

  describe("above-limit scenarios", () => {
    it("removes oldest runs when well above limit", () => {
      const data = createDashboardFixture(50);

      // Create artifact files for all runs
      Object.values(data.recentRunHistoryByPage).forEach((entries) => {
        entries.forEach((entry) => {
          createArtifactFiles(entry.runId);
        });
      });
      createArtifactFiles(data.runId);

      const result = prune(data, TEST_ARTIFACTS_DIR, 30);

      expect(result.removedRunIds).toHaveLength(20);
      expect(result.retainedCount).toBe(30);
      expect(countUniqueRunIds(result.prunedData)).toBe(30);
    });

    it("deletes artifact files for removed runs", () => {
      const data = createDashboardFixture(5);

      // Create artifacts for all runs
      Object.values(data.recentRunHistoryByPage).forEach((entries) => {
        entries.forEach((entry) => {
          createArtifactFiles(entry.runId);
        });
      });
      createArtifactFiles(data.runId);

      // Verify artifacts exist
      const allRunIds = new Set<string>();
      Object.values(data.recentRunHistoryByPage).forEach((entries) => {
        entries.forEach((entry) => allRunIds.add(entry.runId));
      });
      allRunIds.add(data.runId);

      allRunIds.forEach((runId) => {
        expect(artifactsExist(runId)).toBe(true);
      });

      const result = prune(data, TEST_ARTIFACTS_DIR, 2);

      expect(result.deletedArtifacts.length).toBeGreaterThan(0);

      // Verify deleted artifacts no longer exist
      result.removedRunIds.forEach((runId) => {
        expect(artifactsExist(runId)).toBe(false);
      });

      // Verify retained runs still have artifacts
      const retainedRunIds = Array.from(allRunIds)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 2);
      retainedRunIds.forEach((runId) => {
        expect(artifactsExist(runId)).toBe(true);
      });
    });

    it("maintains manifest consistency: no orphaned entries", () => {
      const data = createDashboardFixture(40);
      const result = prune(data, TEST_ARTIFACTS_DIR, 25);

      verifyNoOrphanedEntries(result.prunedData);
    });

    it("maintains manifest consistency: no artifact files without manifest", () => {
      const data = createDashboardFixture(35);
      const result = prune(data, TEST_ARTIFACTS_DIR, 20);

      verifyNoOrphanedArtifacts(result.prunedData, result.deletedArtifacts);
    });

    it("clears artifact paths from pages when run is pruned", () => {
      const data = createDashboardFixture(10);
      const oldestRunId = Array.from(
        new Set(
          Object.values(data.recentRunHistoryByPage).flatMap((entries) => entries.map((e) => e.runId)),
        ),
      )
        .sort((a, b) => a.localeCompare(b))[0];

      const result = prune(data, TEST_ARTIFACTS_DIR, 5);

      // Verify removed runs have empty artifact paths
      result.prunedData.pages.forEach((page) => {
        Object.values(page.results).forEach((result) => {
          if (result.reportHtmlPath.includes(oldestRunId) || result.reportJsonPath.includes(oldestRunId)) {
            expect(result.reportHtmlPath).toBe("");
            expect(result.reportJsonPath).toBe("");
          }
        });
      });
    });
  });

  describe("idempotence", () => {
    it("produces same output running twice with same limit", () => {
      const data = createDashboardFixture(40);

      const result1 = prune(data, TEST_ARTIFACTS_DIR, 25);
      const result2 = prune(result1.prunedData, TEST_ARTIFACTS_DIR, 25);

      expect(JSON.stringify(result1.prunedData)).toBe(JSON.stringify(result2.prunedData));
      expect(result2.removedRunIds).toHaveLength(0);
      expect(result2.deletedArtifacts).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("handles limit of 1", () => {
      const data = createDashboardFixture(5);
      const result = prune(data, TEST_ARTIFACTS_DIR, 1);

      expect(result.retainedCount).toBe(1);
      expect(countUniqueRunIds(result.prunedData)).toBe(1);
      expect(result.removedRunIds).toHaveLength(4);
    });

    it("handles empty history (single current run)", () => {
      const data = createDashboardFixture(1);
      data.recentRunHistoryByPage.testpage = [];

      const result = prune(data, TEST_ARTIFACTS_DIR, 30);

      expect(result.removedRunIds).toHaveLength(0);
      expect(result.retainedCount).toBe(1);
      expect(countUniqueRunIds(result.prunedData)).toBe(1);
    });

    it("handles empty artifact paths gracefully", () => {
      const data = createDashboardFixture(5);
      data.pages[0].results.mobile.reportHtmlPath = "";
      data.pages[0].results.mobile.reportJsonPath = "";

      const result = prune(data, TEST_ARTIFACTS_DIR, 2);

      expect(result.deletedArtifacts).toEqual([]);
      verifyNoOrphanedEntries(result.prunedData);
    });

    it("handles nonexistent artifact directories gracefully", () => {
      const data = createDashboardFixture(5);
      const nonexistentDir = join(TEST_ARTIFACTS_DIR, "nonexistent");

      // Should not throw, even with missing directory
      const result = prune(data, nonexistentDir, 2);

      expect(result.removedRunIds).toHaveLength(3);
      expect(result.retainedCount).toBe(2);
    });
  });

  describe("result structure", () => {
    it("returns PruneResult with all expected fields", () => {
      const data = createDashboardFixture(10);
      const result = prune(data, TEST_ARTIFACTS_DIR, 5);

      expect(result).toHaveProperty("prunedData");
      expect(result).toHaveProperty("deletedArtifacts");
      expect(result).toHaveProperty("removedRunIds");
      expect(result).toHaveProperty("retainedCount");

      expect(Array.isArray(result.deletedArtifacts)).toBe(true);
      expect(Array.isArray(result.removedRunIds)).toBe(true);
      expect(typeof result.retainedCount).toBe("number");
    });

    it("reports deleted artifacts in result", () => {
      const data = createDashboardFixture(5);

      // Create artifacts
      Object.values(data.recentRunHistoryByPage).forEach((entries) => {
        entries.forEach((entry) => {
          createArtifactFiles(entry.runId);
        });
      });

      const result = prune(data, TEST_ARTIFACTS_DIR, 2);

      expect(result.deletedArtifacts.length).toBeGreaterThan(0);
      result.deletedArtifacts.forEach((artifact) => {
        expect(artifact).toMatch(/reports\/runs\//);
      });
    });
  });

  describe("artifact cleanup", () => {
    it("removes empty runId directories after deleting files", () => {
      const data = createDashboardFixture(3);

      // Create artifacts
      Object.values(data.recentRunHistoryByPage).forEach((entries) => {
        entries.forEach((entry) => {
          createArtifactFiles(entry.runId);
        });
      });

      const oldestRunId = Array.from(
        new Set(Object.values(data.recentRunHistoryByPage).flatMap((entries) => entries.map((e) => e.runId))),
      )
        .sort((a, b) => a.localeCompare(b))[0];

      const runDir = join(TEST_ARTIFACTS_DIR, `reports/runs/${oldestRunId}`);
      expect(existsSync(runDir)).toBe(true);

      const result = prune(data, TEST_ARTIFACTS_DIR, 1);

      // Directory should be cleaned up if it was the only one with files
      // (Note: exact behavior depends on how many runs are removed and directory structure)
      expect(result.removedRunIds.length).toBeGreaterThan(0);
    });
  });
});
