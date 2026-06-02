export type PageStatus = "good" | "needs-improvement" | "failing" | "run-failed";

export interface DashboardData {
  generatedAt: string;
  runId: string;
  enabledCategories: string[];
  enabledDevices: string[];
  defaultCategory: string;
  basePath: string;
  summary: DashboardSummary;
  aggregates: DashboardAggregates;
  priority: PriorityEntry[];
  recentRunHistoryByPage: Record<string, PageRunHistoryEntry[]>;
  pages: PageEntry[];
}

export interface DashboardSummary {
  totalConfiguredPages: number;
  totalConfiguredPageDevicePairs: number;
  latestRunResultCount: number;
  statusCounts: StatusCounts;
}

export interface DashboardAggregates {
  byCategory: Record<string, AggregateBucket>;
  byDevice: Record<string, AggregateBucket>;
}

export interface AggregateBucket {
  statusCounts: StatusCounts;
  averageScore: number | null;
  successfulCount: number;
  totalCount: number;
}

export interface StatusCounts {
  good: number;
  "needs-improvement": number;
  failing: number;
  "run-failed": number;
}

export interface PriorityEntry {
  pageId: string;
  label: string;
  group: string;
  device: string;
  status: PageStatus;
  score: number | null;
  failingMetricCount: number;
}

export interface PageRunHistoryEntry {
  runId: string;
  fetchTime: string;
  device: string;
  status: PageStatus;
  lcp: number | null;
}

export interface PageEntry {
  pageId: string;
  label: string;
  url: string;
  group: string;
  results: Record<string, DeviceResult>;
}

export interface DeviceResult {
  status: PageStatus;
  scores: Record<string, number>;
  metrics: {
    lcp: number | null;
    cls: number | null;
    tbt: number | null;
  };
  reportHtmlPath: string;
  reportJsonPath: string;
}

export type FetchState<T> =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "success"; data: T };
