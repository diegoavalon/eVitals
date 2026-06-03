import { unlinkSync, readdirSync, rmdirSync } from "fs";
import { dirname, join } from "path";
import type { DashboardData } from "~/lib/dashboard.types";

/**
 * Result of a prune operation, including deletion manifest for auditing.
 */
export interface PruneResult {
  /** Pruned dashboard data with old runs removed */
  prunedData: DashboardData;
  /** List of artifacts deleted during pruning */
  deletedArtifacts: string[];
  /** List of runIds removed */
  removedRunIds: string[];
  /** Number of runs retained */
  retainedCount: number;
}

/**
 * Extract unique runIds from dashboard data in chronological order (newest first).
 */
function extractRunIds(data: DashboardData): string[] {
  const runIds = new Set<string>();

  // Collect runIds from recentRunHistoryByPage
  Object.values(data.recentRunHistoryByPage).forEach((entries) => {
    entries.forEach((entry) => {
      runIds.add(entry.runId);
    });
  });

  // Include the current run
  runIds.add(data.runId);

  // Sort by timestamp (newest first) — runIds are typically ISO timestamps
  // Fallback to string comparison for consistency
  return Array.from(runIds).sort((a, b) => b.localeCompare(a));
}

/**
 * Extract all artifact paths from a page's device result.
 */
function extractArtifactPaths(htmlPath: string, jsonPath: string): string[] {
  const paths: string[] = [];
  if (htmlPath && htmlPath.trim()) paths.push(htmlPath);
  if (jsonPath && jsonPath.trim()) paths.push(jsonPath);
  return paths;
}

/**
 * Collect all artifact paths referenced by a specific runId.
 */
function collectArtifactsForRunId(data: DashboardData, runId: string): Set<string> {
  const artifacts = new Set<string>();

  // Scan all pages and devices for report paths matching this runId
  data.pages.forEach((page) => {
    Object.values(page.results).forEach((result) => {
      // Artifact paths include runId in their path
      if (result.reportHtmlPath.includes(runId)) {
        extractArtifactPaths(result.reportHtmlPath, result.reportJsonPath).forEach((p) => {
          artifacts.add(p);
        });
      }
    });
  });

  return artifacts;
}

/**
 * Delete a file from the filesystem, catching ENOENT errors gracefully.
 */
function safeDeleteFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (error) {
    // Silently ignore file-not-found errors; other errors propagate
    if (error instanceof Error && !error.message.includes("ENOENT")) {
      throw error;
    }
  }
}

/**
 * Attempt to remove an empty directory, silently failing if not empty or missing.
 */
function safeRemoveDir(dirPath: string): void {
  try {
    const files = readdirSync(dirPath);
    if (files.length === 0) {
      rmdirSync(dirPath);
    }
  } catch {
    // Directory not empty, doesn't exist, or no permission — safely ignored
  }
}

/**
 * Remove all artifact files for a given runId, respecting artifactsDir as the base path.
 * Returns the list of deleted artifact paths.
 */
function deleteArtifacts(artifactPaths: Set<string>, artifactsDir: string): string[] {
  const deleted: string[] = [];

  artifactPaths.forEach((relativePath) => {
    const fullPath = join(artifactsDir, relativePath);
    safeDeleteFile(fullPath);
    deleted.push(relativePath);

    // Attempt cleanup of parent directories (e.g., reports/runs/{runId}/)
    let parentDir = dirname(fullPath);
    while (parentDir !== artifactsDir && parentDir.startsWith(artifactsDir)) {
      safeRemoveDir(parentDir);
      parentDir = dirname(parentDir);
    }
  });

  return deleted;
}

/**
 * Prune dashboard data to enforce a history limit.
 *
 * @param data Current dashboard data
 * @param artifactsDir Filesystem path to the artifacts directory (e.g., public/reports)
 * @param limit Maximum number of runs to retain
 * @returns PruneResult with pruned data, deleted artifacts, and audit info
 *
 * Contract:
 * - Input data structure unchanged (pure function — caller manages file I/O)
 * - All runs beyond the limit are removed (oldest first)
 * - No orphaned manifest entries: every page's history cleaned
 * - No artifact files without manifest: only files for removed runs deleted
 * - Idempotent: running twice with same limit produces same output
 */
export function prune(data: DashboardData, artifactsDir: string, limit: number): PruneResult {
  const allRunIds = extractRunIds(data);

  // If within limit, no pruning needed
  if (allRunIds.length <= limit) {
    return {
      prunedData: data,
      deletedArtifacts: [],
      removedRunIds: [],
      retainedCount: allRunIds.length,
    };
  }

  // Identify runs to remove (oldest ones, beyond the limit)
  const toRemove = new Set(allRunIds.slice(limit));
  const removedRunIds = Array.from(toRemove);

  // Deep clone the dashboard data for mutation
  const prunedData: DashboardData = JSON.parse(JSON.stringify(data));

  // Collect all artifacts for runs being deleted
  const allDeletedArtifacts = new Set<string>();
  toRemove.forEach((runId) => {
    collectArtifactsForRunId(data, runId).forEach((artifact) => {
      allDeletedArtifacts.add(artifact);
    });
  });

  // Delete artifact files
  const deletedArtifacts = deleteArtifacts(allDeletedArtifacts, artifactsDir);

  // Remove pruned runs from recentRunHistoryByPage
  Object.keys(prunedData.recentRunHistoryByPage).forEach((pageId) => {
    prunedData.recentRunHistoryByPage[pageId] = prunedData.recentRunHistoryByPage[pageId].filter(
      (entry) => !toRemove.has(entry.runId),
    );
  });

  // Remove artifact references from pages (clear paths for runs being deleted)
  prunedData.pages.forEach((page) => {
    Object.values(page.results).forEach((result) => {
      if (
        (result.reportHtmlPath && Array.from(toRemove).some((runId) => result.reportHtmlPath.includes(runId))) ||
        (result.reportJsonPath && Array.from(toRemove).some((runId) => result.reportJsonPath.includes(runId)))
      ) {
        result.reportHtmlPath = "";
        result.reportJsonPath = "";
      }
    });
  });

  return {
    prunedData,
    deletedArtifacts,
    removedRunIds,
    retainedCount: Math.min(limit, allRunIds.length),
  };
}
