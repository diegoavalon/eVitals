import { useState, useMemo, useRef } from "react";
import { useDashboardData } from "~/lib/useDashboardData";
import type {
  PageStatus,
  DashboardData,
  PageEntry,
  DeviceResult,
} from "~/lib/dashboard.types";
import { EhiButton } from "~/components/ui/EhiButton";
import { EhiDrawer } from "~/components/ui/EhiDrawer";
import { useDashboardFilters } from "~/lib/DashboardFiltersContext";
import { withBasePath } from "~/lib/url";

export default function Home() {
  const state = useDashboardData();
  const [reportPath, setReportPath] = useState<string | null>(null);
  const { selectedDevice, selectedCategory } = useDashboardFilters();

  if (state.status === "loading") {
    return (
      <main className="p-8">
        <div
          role="status"
          aria-label="Loading dashboard"
          className="text-neutral font-open-sans text-[16px]"
        >
          Loading dashboard data…
        </div>
      </main>
    );
  }

  if (state.status === "missing") {
    return (
      <main className="p-8">
        <div role="alert" className="text-error font-open-sans text-[16px]">
          Dashboard data not found. Run a Lighthouse report first.
        </div>
      </main>
    );
  }

  if (state.status === "invalid") {
    return (
      <main className="p-8">
        <div role="alert" className="text-error font-open-sans text-[16px]">
          Dashboard data is corrupted or invalid. Please regenerate.
        </div>
      </main>
    );
  }

  const { data } = state;

  // Compute passing count for headline
  const passingCount = data.pages
    .flatMap((page) => Object.entries(page.results))
    .filter(([device]) => device === selectedDevice)
    .filter(([, result]) => result.status === "good").length;
  const totalPages = data.pages.length;

  return (
    <main className="bg-surface-canvas">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Page headline */}
        <header className="mb-8">
          <h1 className="font-poppins font-bold text-[32px] text-primary leading-tight">
            Dashboard
          </h1>
          <p className="font-open-sans text-[16px] text-on-surface-dark mt-2">
            {passingCount} / {totalPages} pages passing{" "}
            {formatCategoryName(selectedCategory)} ({selectedDevice}, latest
            run)
          </p>
        </header>

        {/* Summary Section */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <SummaryCard
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
          />
        </div>

        {/* Status Counts */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatusCountCard
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            status="good"
            label="Passing"
          />
          <StatusCountCard
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            status="needs-improvement"
            label="Needs Improvement"
          />
          <StatusCountCard
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            status="failing"
            label="Failing"
          />
          <StatusCountCard
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            status="run-failed"
            label="Run Failed"
          />
        </div>

        {/* Priority Card */}
        <div className="mb-8">
          <PrioritySection
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            onViewReport={(path) => setReportPath(withBasePath(path))}
          />
        </div>

        {/* Most Recent Reports */}
        <div>
          <RecentReportsSection
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            enabledCategories={data.enabledCategories}
            onViewReport={(path) => setReportPath(withBasePath(path))}
          />
        </div>
      </div>

      <EhiDrawer
        open={reportPath !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReportPath(null);
        }}
        title="Lighthouse Report"
      >
        {reportPath && <ReportFrame src={reportPath} />}
      </EhiDrawer>
    </main>
  );
}

function SummaryCard({
  data,
  selectedDevice,
  selectedCategory,
}: {
  data: DashboardData;
  selectedDevice: string;
  selectedCategory: string;
}) {
  const categoryAggregate = data.aggregates.byCategory[selectedCategory];
  const scoreToDisplay = categoryAggregate?.averageScore ?? 0;

  return (
    <div className="md:col-span-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="font-poppins font-bold text-[20px] text-on-surface mb-2">
        Overall {formatCategoryName(selectedCategory)} Score
      </h2>
      <div className="flex items-end gap-2">
        <span className="font-poppins font-bold text-[48px] text-primary">
          {Math.round(scoreToDisplay)}
        </span>
        <span className="font-open-sans text-[14px] text-on-surface-dark mb-2">
          median score
        </span>
      </div>
    </div>
  );
}

function StatusCountCard({
  data,
  selectedDevice,
  selectedCategory,
  status,
  label,
}: {
  data: DashboardData;
  selectedDevice: string;
  selectedCategory: string;
  status: PageStatus;
  label: string;
}) {
  const count = data.pages
    .flatMap((page) => Object.entries(page.results))
    .filter(([device]) => device === selectedDevice)
    .filter(([, result]) => result.status === status).length;

  const bgClass: Record<PageStatus, string> = {
    good: "bg-primary text-white",
    "needs-improvement": "bg-warning text-on-surface",
    failing: "bg-error text-white",
    "run-failed": "bg-neutral text-white",
  };

  return (
    <div className={`rounded-lg p-6 text-center ${bgClass[status]}`}>
      <div className="font-poppins font-bold text-[32px]">{count}</div>
      <div className="font-open-sans text-[14px] mt-1">{label}</div>
    </div>
  );
}

function PrioritySection({
  data,
  selectedDevice,
  selectedCategory,
  onViewReport,
}: {
  data: DashboardData;
  selectedDevice: string;
  selectedCategory: string;
  onViewReport: (path: string) => void;
}) {
  const filteredPriority = useMemo(() => {
    return data.priority.filter((entry) => entry.device === selectedDevice);
  }, [data.priority, selectedDevice]);

  if (filteredPriority.length === 0) {
    return null;
  }

  const topPriority = filteredPriority[0];
  const page = data.pages.find((p) => p.pageId === topPriority.pageId);
  const deviceResult = page?.results[selectedDevice];

  return (
    <div className="rounded-lg border-2 border-alert bg-surface p-6 shadow-sm">
      <h3 className="font-poppins font-bold text-[18px] text-alert mb-4">
        Needs Attention First
      </h3>
      {page && deviceResult && (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-poppins font-bold text-[16px] text-on-surface">
              {page.label}
            </p>
            <p className="font-open-sans text-[14px] text-on-surface-dark mt-1">
              {page.group}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <StatusBadge
                status={topPriority.status}
                score={topPriority.score}
              />
              {selectedCategory === "performance" && (
                <div className="font-open-sans text-[14px] text-on-surface-dark">
                  {topPriority.failingMetricCount} metric
                  {topPriority.failingMetricCount !== 1 ? "s" : ""} failing
                </div>
              )}
            </div>
          </div>
          {deviceResult.reportHtmlPath && (
            <EhiButton
              variant="secondary"
              onClick={() => onViewReport(deviceResult.reportHtmlPath)}
            >
              View Report
            </EhiButton>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Metric helpers ──────────────────────────────────────────────────────────

type MetricKey = "lcp" | "cls" | "tbt" | "fcp" | "si";

const METRIC_THRESHOLDS: Record<MetricKey, { good: number; ni: number }> = {
  lcp: { good: 2500, ni: 4000 },
  cls: { good: 0.1, ni: 0.25 },
  tbt: { good: 200, ni: 600 },
  fcp: { good: 1800, ni: 3000 },
  si: { good: 3800, ni: 7300 },
};

function getMetricStatus(key: MetricKey, value: number): PageStatus {
  const t = METRIC_THRESHOLDS[key];
  if (value <= t.good) return "good";
  if (value <= t.ni) return "needs-improvement";
  return "failing";
}

function getMetricBarWidth(key: MetricKey, value: number): number {
  const maxVal: Record<MetricKey, number> = { lcp: 4000, cls: 0.25, tbt: 600, fcp: 3000, si: 7300 };
  return Math.min((value / maxVal[key]) * 100, 100);
}

function formatMetricValue(key: MetricKey, value: number): string {
  if (key === "lcp")
    return value >= 1000
      ? `${(value / 1000).toFixed(1)} s`
      : `${Math.round(value)} ms`;
  if (key === "cls") return value.toFixed(2);
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} s`
    : `${Math.round(value)} ms`;
}

function scoreToStatus(score: number | null): PageStatus {
  if (score === null) return "run-failed";
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "failing";
}

function formatTimeAgo(fetchTime: string): string {
  const mins = Math.floor(
    (Date.now() - new Date(fetchTime).getTime()) / 60_000,
  );
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
}

function formatClock(fetchTime: string): string {
  return new Date(fetchTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ─── Status color maps ───────────────────────────────────────────────────────

const STATUS_TEXT_CLASS: Record<PageStatus, string> = {
  good: "text-primary",
  "needs-improvement": "text-action",
  failing: "text-error",
  "run-failed": "text-neutral",
};

const STATUS_DOT_CLASS: Record<PageStatus, string> = {
  good: "bg-primary",
  "needs-improvement": "bg-action",
  failing: "bg-error",
  "run-failed": "bg-neutral",
};

const STATUS_BAR_CLASS: Record<PageStatus, string> = {
  good: "bg-primary",
  "needs-improvement": "bg-action",
  failing: "bg-error",
  "run-failed": "bg-neutral",
};

const STROKE_COLORS: Record<PageStatus, string> = {
  good: "#0c6e1e",
  "needs-improvement": "#fa6200",
  failing: "#b8000f",
  "run-failed": "#666666",
};

// ─── RecentReportsSection ────────────────────────────────────────────────────
function RecentReportsSection({
  data,
  selectedDevice,
  selectedCategory,
  enabledCategories,
  onViewReport,
}: {
  data: DashboardData;
  selectedDevice: string;
  selectedCategory: string;
  enabledCategories: string[];
  onViewReport: (path: string) => void;
}) {
  const rows = useMemo(() => {
    return data.pages
      .flatMap((page) => {
        const result = page.results[selectedDevice];
        if (!result) return [];
        const history = (data.recentRunHistoryByPage[page.pageId] ?? [])
          .filter((h) => h.device === selectedDevice)
          .sort(
            (a, b) =>
              new Date(a.fetchTime).getTime() - new Date(b.fetchTime).getTime(),
          );
        const latestEntry = history[history.length - 1];
        return [
          { page, result, history, fetchTime: latestEntry?.fetchTime ?? null },
        ];
      })
      .sort((a, b) => {
        if (!a.fetchTime && !b.fetchTime) return 0;
        if (!a.fetchTime) return 1;
        if (!b.fetchTime) return -1;
        return (
          new Date(b.fetchTime).getTime() - new Date(a.fetchTime).getTime()
        );
      });
  }, [data.pages, data.recentRunHistoryByPage, selectedDevice]);

  return (
    <section aria-label="Most recent reports">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-poppins font-bold text-[20px] text-on-surface">
          Most Recent
        </h2>
        <span className="font-open-sans text-[12px] text-neutral">
          {selectedDevice} runs · newest first
        </span>
      </div>
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {rows.map(({ page, result, history, fetchTime }, idx) => (
          <RecentReportRow
            key={`${page.pageId}-${selectedDevice}`}
            page={page}
            device={selectedDevice}
            result={result}
            fetchTime={fetchTime}
            lcpHistory={history.map((h) => ({
              time: new Date(h.fetchTime).getTime(),
              lcp: h.lcp,
              status: h.status,
            }))}
            selectedCategory={selectedCategory}
            enabledCategories={enabledCategories}
            isLast={idx === rows.length - 1}
            onViewReport={onViewReport}
          />
        ))}
      </div>
    </section>
  );
}

function RecentReportRow({
  page,
  device,
  result,
  fetchTime,
  selectedCategory,
  isLast,
  onViewReport,
}: {
  page: PageEntry;
  device: string;
  result: DeviceResult;
  fetchTime: string | null;
  lcpHistory: { time: number; lcp: number | null; status: PageStatus }[];
  selectedCategory: string;
  enabledCategories: string[];
  isLast: boolean;
  onViewReport: (path: string) => void;
}) {
  const score =
    result.status === "run-failed"
      ? null
      : (result.scores[selectedCategory] ?? null);
  const scoreStatus =
    result.status === "run-failed" ? "run-failed" : scoreToStatus(score);

  return (
    <div className={isLast ? "" : "border-b border-border"}>
      {/* Summary row */}
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-subtle transition-colors cursor-pointer">
        {/* Time column */}
        <ScoreGauge
          score={
            result.status === "run-failed"
              ? null
              : (result.scores[selectedCategory] ?? null)
          }
          label={formatCategoryName(selectedCategory)}
        />
        <div className="w-[88px] flex-shrink-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {fetchTime ? (
              <span className="font-open-sans text-[11px] text-on-surface-dark leading-tight">
                {formatTimeAgo(fetchTime)}
              </span>
            ) : (
              <span className="font-open-sans text-[11px] text-neutral">—</span>
            )}
          </div>
          {fetchTime && (
            <span className="font-open-sans text-[11px] text-neutral pl-[14px]">
              {formatClock(fetchTime)}
            </span>
          )}
        </div>

        {/* Page info column */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex gap-2 min-w-0">
            <span className="font-poppins font-bold text-[14px] text-on-surface truncate">
              {page.label}
            </span>
            <DeviceBadge device={device} />
          </div>
          <span className="label">{page.group}</span>
        </div>

        {/* Metric columns */}
        <MetricColumn metricKey="lcp" value={result.metrics.lcp} />
        <MetricColumn metricKey="cls" value={result.metrics.cls} />
        <MetricColumn metricKey="tbt" value={result.metrics.tbt} />
        <MetricColumn metricKey="fcp" value={result.metrics.fcp} />
        <MetricColumn metricKey="si" value={result.metrics.si} />

        {/* View Report */}
        {result.reportHtmlPath ? (
          <EhiButton
            variant="link"
            onClick={(e) => {
              e.stopPropagation();
              onViewReport(result.reportHtmlPath);
            }}
          >
            Full Report
          </EhiButton>
        ) : (
          <div className="w-[52px]" />
        )}
      </div>
    </div>
  );
}

// ─── ScoreGauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, label }: { score: number | null; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const status = score !== null ? scoreToStatus(score) : "run-failed";
  const color = STROKE_COLORS[status];
  const filled = score !== null ? (score / 100) * circumference : 0;

  return (
    <div className="flex flex-col items-center">
      <span className="leading-0 label text-center mb-1">{label}</span>

      <div className="relative" style={{ width: 68, height: 68 }}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="5"
          />
          {score !== null && (
            <circle
              cx="34"
              cy="34"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeLinecap="round"
              transform="rotate(-90 34 34)"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center gap-1 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span
            className="font-poppins font-bold text-[17px] leading-none"
            style={{ color }}
          >
            {score !== null ? score : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DeviceBadge ─────────────────────────────────────────────────────────────
function DeviceBadge({ device }: { device: string }) {
  const isMobile = device === "mobile";
  return (
    <span className="inline-flex items-center gap-1 border border-border rounded px-1.5 py-0.5 font-open-sans text-[11px] text-neutral flex-shrink-0">
      {isMobile ? (
        <svg
          width="9"
          height="13"
          viewBox="0 0 9 13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <rect x="0.7" y="0.7" width="7.6" height="11.6" rx="1.3" />
          <circle
            cx="4.5"
            cy="10.5"
            r="0.5"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      ) : (
        <svg
          width="13"
          height="10"
          viewBox="0 0 13 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <rect x="0.7" y="0.7" width="11.6" height="7.6" rx="1" />
          <path d="M3.5 8.3v1M9.5 8.3v1M2 9.3h9" strokeLinecap="round" />
        </svg>
      )}
      {isMobile ? "Mobile" : "Desktop"}
    </span>
  );
}

function MetricColumn({
  metricKey,
  value,
}: {
  metricKey: MetricKey;
  value: number | null;
}) {
  const label = metricKey.toUpperCase();

  if (value === null) {
    return (
      <div className="w-[96px] flex-shrink-0 flex flex-col gap-1">
        <span className="font-open-sans text-[10px] text-neutral tracking-wider">
          {label}
        </span>
        <span className="font-open-sans text-[13px] text-neutral">—</span>
        <div className="h-1 bg-surface-muted rounded-full" />
      </div>
    );
  }

  const mStatus = getMetricStatus(metricKey, value);
  const barWidth = getMetricBarWidth(metricKey, value);

  return (
    <div className="w-[96px] flex-shrink-0 flex flex-col gap-1">
      <span className="font-open-sans text-[10px] text-neutral tracking-wider">
        {label}
      </span>
      <span
        className={`font-poppins font-bold text-[13px] ${STATUS_TEXT_CLASS[mStatus]}`}
      >
        {formatMetricValue(metricKey, value)}
      </span>
      <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${STATUS_BAR_CLASS[mStatus]}`}
          style={{ width: `${barWidth}%`, minWidth: "3px" }}
        />
      </div>
    </div>
  );
}

function ReportFrame({ src }: { src: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  function handleLoad() {
    try {
      const title = iframeRef.current?.contentDocument?.title ?? "";
      setStatus(title === "Lighthouse Report" ? "ready" : "missing");
    } catch {
      // Cross-origin access denied — assume report loaded fine
      setStatus("ready");
    }
  }

  return (
    <div className="relative h-full w-full">
      {status === "loading" && (
        <div className="flex h-full items-center justify-center">
          <p className="font-open-sans text-[16px] text-neutral">
            Loading report…
          </p>
        </div>
      )}
      {status === "missing" && <ReportEmptyState />}
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={handleLoad}
        className={`h-full w-full border-none${status !== "ready" ? " hidden" : ""}`}
        title="Lighthouse Report"
      />
    </div>
  );
}

function ReportEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <svg
        className="size-12 text-neutral"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="4"
          width="28"
          height="36"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M28 4v10h8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M17 28l7-7m0 0l7 7m-7-7v0"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="38"
          cy="38"
          r="8"
          fill="var(--color-surface-canvas)"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M35 38h6M38 35v6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(45 38 38)"
        />
      </svg>
      <div>
        <h3 className="font-poppins font-bold text-[18px] text-on-surface">
          Report not available
        </h3>
        <p className="mt-1 font-open-sans text-[14px] text-neutral max-w-xs mx-auto">
          This Lighthouse report hasn't been generated yet. Run a new scan to
          generate it.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  score,
}: {
  status: PageStatus;
  score: number | null;
}) {
  const colorClass: Record<PageStatus, string> = {
    good: "text-primary bg-surface-subtle",
    "needs-improvement": "text-warning bg-surface-subtle",
    failing: "text-error bg-surface-subtle",
    "run-failed": "text-neutral bg-surface-muted",
  };
  const label: Record<PageStatus, string> = {
    good: "Good",
    "needs-improvement": "Needs Improvement",
    failing: "Failing",
    "run-failed": "Run Failed",
  };
  return (
    <span
      className={`inline-block font-open-sans font-bold text-[12px] rounded px-2 py-1 ${colorClass[status]}`}
    >
      {label[status]} {score !== null && `(${score})`}
    </span>
  );
}

function formatCategoryName(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
