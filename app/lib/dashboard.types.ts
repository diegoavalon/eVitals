export type PageStatus = "good" | "needs-improvement" | "failing" | "run-failed";

export interface DashboardData {
  generatedAt: string;
  runId: string;
  enabledCategories: string[];
  enabledDevices: string[];
  defaultCategory: string;
  basePath: string;
  pages: PageEntry[];
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
    lcp: number;
    cls: number;
    tbt: number;
  };
  reportHtmlPath: string;
  reportJsonPath: string;
}

export type FetchState<T> =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "success"; data: T };
