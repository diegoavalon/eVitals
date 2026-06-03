import type { DashboardConfig, PageRegistry } from "~/lib/config";
import type {
  LighthouseFailure,
  LighthouseMetricStatuses,
  LighthouseRunResult,
  MetricStatus,
} from "~/lib/lighthouse";
import { CLS_NI_THRESHOLD, LCP_NI_THRESHOLD, TBT_NI_THRESHOLD } from "~/lib/lighthouse";
import type {
  AggregateBucket,
  DashboardAggregates,
  DashboardData,
  PageEntry,
  PageRunHistoryEntry,
  PageStatus,
  PriorityEntry,
  StatusCounts,
} from "~/lib/dashboard.types";

export interface GeneratorInputResult {
  pageId: string;
  result: LighthouseRunResult;
}

export interface RunManifestEntry {
  pageId: string;
  label: string;
  url: string;
  group: string;
  device: string;
  status: PageStatus;
  fetchTime: string;
  reportJsonPath: string;
  reportHtmlPath: string;
  failure?: LighthouseFailure;
}

export interface RunManifest {
  runId: string;
  generatedAt: string;
  fetchTime: string;
  statusCounts: StatusCounts;
  results: RunManifestEntry[];
}

export interface GeneratorInput {
  config: DashboardConfig;
  pages: PageRegistry;
  parsedResults: GeneratorInputResult[];
  generatedAt: string;
}

export interface GeneratedArtifacts {
  dashboardData: DashboardData;
  manifests: RunManifest[];
}

const STATUS_RANK: Record<PageStatus, number> = {
  good: 0,
  "needs-improvement": 1,
  failing: 2,
  "run-failed": 3,
};

function emptyStatusCounts(): StatusCounts {
  return { good: 0, "needs-improvement": 0, failing: 0, "run-failed": 0 };
}

function mapMetricStatusToPageStatus(status: MetricStatus): PageStatus {
  if (status === "pass") return "good";
  if (status === "fail") return "failing";
  return status;
}

function toScore100(raw: number | null | undefined): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

function aggregateAverage(sum: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((sum / count) * 100) / 100;
}

function runSortValue(result: GeneratorInputResult): string {
  return result.result.fetchTime || result.result.runId;
}

function compareResultsByRun(a: GeneratorInputResult, b: GeneratorInputResult): number {
  const byFetch = runSortValue(b).localeCompare(runSortValue(a));
  if (byFetch !== 0) return byFetch;
  const byRun = b.result.runId.localeCompare(a.result.runId);
  if (byRun !== 0) return byRun;
  const byPage = a.pageId.localeCompare(b.pageId);
  if (byPage !== 0) return byPage;
  return a.result.device.localeCompare(b.result.device);
}

function buildRunOrder(parsedResults: GeneratorInputResult[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const item of [...parsedResults].sort(compareResultsByRun)) {
    if (!seen.has(item.result.runId)) {
      seen.add(item.result.runId);
      ordered.push(item.result.runId);
    }
  }
  return ordered;
}

function asDeviceResult(config: DashboardConfig, item: GeneratorInputResult | undefined): PageEntry["results"][string] {
  if (!item) {
    return {
      status: "run-failed",
      scores: Object.fromEntries(config.enabledCategories.map((category) => [category, 0])),
      metrics: { lcp: null, cls: null, tbt: null, fcp: null, si: null },
      reportHtmlPath: "",
      reportJsonPath: "",
    };
  }

  const scores = Object.fromEntries(
    config.enabledCategories.map((category) => [category, toScore100(item.result.categoryScores[category]) ?? 0]),
  );

  return {
    status: mapMetricStatusToPageStatus(item.result.status),
    scores,
    metrics: {
      lcp: item.result.metrics.lcp,
      cls: item.result.metrics.cls,
      tbt: item.result.metrics.tbt,
      fcp: item.result.metrics.fcp,
      si: item.result.metrics.si,
    },
    reportHtmlPath: item.result.reportHtmlPath,
    reportJsonPath: item.result.reportJsonPath,
  };
}

function metricFailureCount(metricStatuses: LighthouseMetricStatuses): number {
  return Object.values(metricStatuses).filter((status) => status === "fail" || status === "run-failed").length;
}

function thresholdSeverity(item: GeneratorInputResult | undefined): number {
  if (!item) return Number.POSITIVE_INFINITY;
  const { metrics } = item.result;
  const lcpSeverity = metrics.lcp == null ? Number.POSITIVE_INFINITY : Math.max(0, metrics.lcp - LCP_NI_THRESHOLD);
  const clsSeverity = metrics.cls == null ? Number.POSITIVE_INFINITY : Math.max(0, (metrics.cls - CLS_NI_THRESHOLD) * 10_000);
  const tbtSeverity = metrics.tbt == null ? Number.POSITIVE_INFINITY : Math.max(0, metrics.tbt - TBT_NI_THRESHOLD);
  return lcpSeverity + clsSeverity + tbtSeverity;
}

function buildPriority(config: DashboardConfig, pages: PageRegistry, latestRunLookup: Map<string, GeneratorInputResult>): PriorityEntry[] {
  const candidates: Array<PriorityEntry & { severity: number }> = [];
  for (const page of pages) {
    for (const device of config.devices) {
      const item = latestRunLookup.get(`${page.id}::${device}`);
      const status = item ? mapMetricStatusToPageStatus(item.result.status) : "run-failed";
      candidates.push({
        pageId: page.id,
        label: page.label,
        group: page.group,
        device,
        status,
        score: item ? toScore100(item.result.performanceScore) : null,
        failingMetricCount: item ? metricFailureCount(item.result.metricStatuses) : 3,
        severity: thresholdSeverity(item),
      });
    }
  }

  candidates.sort((a, b) => {
    const byStatus = STATUS_RANK[b.status] - STATUS_RANK[a.status];
    if (byStatus !== 0) return byStatus;
    const byFailingMetrics = b.failingMetricCount - a.failingMetricCount;
    if (byFailingMetrics !== 0) return byFailingMetrics;
    const bySeverity = b.severity - a.severity;
    if (bySeverity !== 0) return bySeverity;
    const scoreA = a.score ?? Number.POSITIVE_INFINITY;
    const scoreB = b.score ?? Number.POSITIVE_INFINITY;
    if (scoreA !== scoreB) return scoreA - scoreB;
    const byPage = a.pageId.localeCompare(b.pageId);
    if (byPage !== 0) return byPage;
    return a.device.localeCompare(b.device);
  });

  return candidates.map(({ severity: _severity, ...entry }) => entry);
}

function initAggregateBucket(): AggregateBucket {
  return {
    statusCounts: emptyStatusCounts(),
    averageScore: null,
    successfulCount: 0,
    totalCount: 0,
  };
}

export function generateDashboardData(input: GeneratorInput): DashboardData {
  const { config, pages, parsedResults, generatedAt } = input;
  const runOrder = buildRunOrder(parsedResults);
  const latestRunId = runOrder[0] ?? "";
  const latestResults = parsedResults.filter((item) => item.result.runId === latestRunId);

  const latestRunLookup = new Map<string, GeneratorInputResult>();
  for (const item of latestResults) {
    latestRunLookup.set(`${item.pageId}::${item.result.device}`, item);
  }

  const pageEntries: PageEntry[] = pages.map((page) => ({
    pageId: page.id,
    label: page.label,
    url: page.url,
    group: page.group,
    results: Object.fromEntries(
      config.devices.map((device) => [device, asDeviceResult(config, latestRunLookup.get(`${page.id}::${device}`))]),
    ),
  }));

  const summaryStatusCounts = emptyStatusCounts();
  for (const page of pageEntries) {
    for (const device of config.devices) {
      const status = page.results[device]?.status ?? "run-failed";
      summaryStatusCounts[status] += 1;
    }
  }

  const aggregates: DashboardAggregates = {
    byCategory: Object.fromEntries(config.enabledCategories.map((category) => [category, initAggregateBucket()])),
    byDevice: Object.fromEntries(config.devices.map((device) => [device, initAggregateBucket()])),
  };

  const categoryScoreSums = Object.fromEntries(config.enabledCategories.map((category) => [category, 0]));
  const categoryScoreCounts = Object.fromEntries(config.enabledCategories.map((category) => [category, 0]));
  const deviceScoreSums = Object.fromEntries(config.devices.map((device) => [device, 0]));
  const deviceScoreCounts = Object.fromEntries(config.devices.map((device) => [device, 0]));

  for (const page of pages) {
    for (const device of config.devices) {
      const item = latestRunLookup.get(`${page.id}::${device}`);
      const overallStatus = item ? mapMetricStatusToPageStatus(item.result.status) : "run-failed";
      const deviceBucket = aggregates.byDevice[device];
      deviceBucket.totalCount += 1;
      deviceBucket.statusCounts[overallStatus] += 1;
      if (overallStatus !== "run-failed") deviceBucket.successfulCount += 1;

      const defaultCategoryScore = item ? toScore100(item.result.categoryScores[config.defaultCategory]) : null;
      if (defaultCategoryScore != null) {
        deviceScoreSums[device] += defaultCategoryScore;
        deviceScoreCounts[device] += 1;
      }

      for (const category of config.enabledCategories) {
        const categoryBucket = aggregates.byCategory[category];
        const categoryStatus = item ? mapMetricStatusToPageStatus(item.result.categoryStatuses[category] ?? "run-failed") : "run-failed";
        categoryBucket.totalCount += 1;
        categoryBucket.statusCounts[categoryStatus] += 1;
        if (categoryStatus !== "run-failed") categoryBucket.successfulCount += 1;

        const score = item ? toScore100(item.result.categoryScores[category]) : null;
        if (score != null) {
          categoryScoreSums[category] += score;
          categoryScoreCounts[category] += 1;
        }
      }
    }
  }

  for (const category of config.enabledCategories) {
    aggregates.byCategory[category].averageScore = aggregateAverage(categoryScoreSums[category], categoryScoreCounts[category]);
  }
  for (const device of config.devices) {
    aggregates.byDevice[device].averageScore = aggregateAverage(deviceScoreSums[device], deviceScoreCounts[device]);
  }

  const recentRunHistoryByPage: Record<string, PageRunHistoryEntry[]> = Object.fromEntries(pages.map((page) => [page.id, []]));
  const sortedHistory = [...parsedResults].sort(compareResultsByRun);
  for (const item of sortedHistory) {
    const pageHistory = recentRunHistoryByPage[item.pageId];
    if (!pageHistory || pageHistory.length >= config.historyLimit) continue;
    pageHistory.push({
      runId: item.result.runId,
      fetchTime: item.result.fetchTime,
      device: item.result.device,
      status: mapMetricStatusToPageStatus(item.result.status),
      lcp: item.result.metrics.lcp,
    });
  }

  return {
    generatedAt,
    runId: latestRunId,
    enabledCategories: [...config.enabledCategories],
    enabledDevices: [...config.devices],
    defaultCategory: config.defaultCategory,
    basePath: config.basePath,
    summary: {
      totalConfiguredPages: pages.length,
      totalConfiguredPageDevicePairs: pages.length * config.devices.length,
      latestRunResultCount: latestResults.length,
      statusCounts: summaryStatusCounts,
    },
    aggregates,
    priority: buildPriority(config, pages, latestRunLookup),
    recentRunHistoryByPage,
    pages: pageEntries,
  };
}

export function generateRunManifests(input: GeneratorInput): RunManifest[] {
  const { parsedResults, pages, generatedAt } = input;
  const pageLookup = new Map(pages.map((page) => [page.id, page]));
  const runOrder = buildRunOrder(parsedResults);

  return runOrder.map((runId) => {
    const results = parsedResults
      .filter((item) => item.result.runId === runId)
      .map<RunManifestEntry>((item) => {
        const page = pageLookup.get(item.pageId);
        return {
          pageId: item.pageId,
          label: page?.label ?? item.pageId,
          url: page?.url ?? item.result.requestedUrl,
          group: page?.group ?? "unknown",
          device: item.result.device,
          status: mapMetricStatusToPageStatus(item.result.status),
          fetchTime: item.result.fetchTime,
          reportJsonPath: item.result.reportJsonPath,
          reportHtmlPath: item.result.reportHtmlPath,
          failure: item.result.failure,
        };
      })
      .sort((a, b) => (a.pageId === b.pageId ? a.device.localeCompare(b.device) : a.pageId.localeCompare(b.pageId)));

    const statusCounts = results.reduce((acc, result) => {
      acc[result.status] += 1;
      return acc;
    }, emptyStatusCounts());

    return {
      runId,
      generatedAt,
      fetchTime: results[0]?.fetchTime ?? "",
      statusCounts,
      results,
    };
  });
}

export function generateDashboardArtifacts(input: GeneratorInput): GeneratedArtifacts {
  return {
    dashboardData: generateDashboardData(input),
    manifests: generateRunManifests(input),
  };
}
