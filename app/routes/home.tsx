import { useState, useMemo, useRef, type ReactNode } from "react";
import { useDashboardData } from "~/lib/useDashboardData";
import type {
  PageStatus,
  DashboardData,
  PageEntry,
  DeviceResult,
  PriorityEntry,
} from "~/lib/dashboard.types";
import { EhiButton } from "~/components/ui/EhiButton";
import { EhiDrawer } from "~/components/ui/EhiDrawer";
import { useDashboardFilters } from "~/lib/DashboardFiltersContext";

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

  return (
    <main className="bg-surface-canvas">
      <div className="container">
        <HeroSection
          data={data}
          selectedDevice={selectedDevice}
          selectedCategory={selectedCategory}
          onViewReport={setReportPath}
        />

        <RecentReportsSection
          data={data}
          selectedDevice={selectedDevice}
          selectedCategory={selectedCategory}
          enabledCategories={data.enabledCategories}
          onViewReport={setReportPath}
        />
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

// ─── HeroSection ─────────────────────────────────────────────────────────────

function HeroSection({
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
  const filteredPriority = useMemo(
    () => data.priority.filter((e) => e.device === selectedDevice),
    [data.priority, selectedDevice],
  );

  const passingCount = useMemo(
    () =>
      data.pages
        .flatMap((page) => Object.entries(page.results))
        .filter(([device]) => device === selectedDevice)
        .filter(([, result]) => result.status === "good").length,
    [data.pages, selectedDevice],
  );

  const totalPages = data.pages.length;

  const worstEntry = filteredPriority[0] ?? null;
  const worstPage = worstEntry
    ? (data.pages.find((p) => p.pageId === worstEntry.pageId) ?? null)
    : null;
  const worstResult = worstPage?.results[selectedDevice] ?? null;

  return (
    <section className="mb-10 grid md:grid-cols-[1fr_1fr] gap-10 items-center">
      {/* Left: prose summary */}
      <div>
        <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1 mb-6">
          <span className="w-2 h-2 rounded-full bg-primary inline-block flex-shrink-0" />
          <span className="font-open-sans text-[13px] text-on-surface-dark">
            Daily digest · {capitalize(selectedDevice)} ·{" "}
            {formatCategoryName(selectedCategory)}
          </span>
        </div>

        <h1 className="font-poppins font-bold text-[52px] leading-[1.1] text-on-surface mb-5">
          <span className="italic text-primary">
            {passingCount} of {totalPages}
          </span>{" "}
          key pages
          <br />
          pass every core vital.
        </h1>

        <p className="font-open-sans text-lg text-on-surface-dark leading-relaxed">
          {generateInsightText(
            worstEntry,
            worstPage,
            worstResult,
            selectedCategory,
            passingCount,
            totalPages,
          )}
        </p>
      </div>

      {/* Right: attention carousel */}
      <AttentionCarousel
        priorityPages={filteredPriority}
        data={data}
        selectedDevice={selectedDevice}
        selectedCategory={selectedCategory}
        onViewReport={onViewReport}
      />
    </section>
  );
}

// ─── AttentionCarousel ────────────────────────────────────────────────────────

function AttentionCarousel({
  priorityPages,
  data,
  selectedDevice,
  selectedCategory,
  onViewReport,
}: {
  priorityPages: PriorityEntry[];
  data: DashboardData;
  selectedDevice: string;
  selectedCategory: string;
  onViewReport: (path: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = Math.min(
    currentIndex,
    Math.max(0, priorityPages.length - 1),
  );

  const deviceResults = useMemo(
    () =>
      data.pages
        .flatMap((page) => Object.entries(page.results))
        .filter(([device]) => device === selectedDevice)
        .map(([, result]) => result),
    [data.pages, selectedDevice],
  );

  const failingCount = deviceResults.filter(
    (r) => r.status === "failing",
  ).length;
  const niCount = deviceResults.filter(
    (r) => r.status === "needs-improvement",
  ).length;
  const runFailedCount = deviceResults.filter(
    (r) => r.status === "run-failed",
  ).length;

  if (priorityPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-border bg-surface">
        <span className="font-poppins font-bold text-[32px] text-primary mb-1">
          ✓
        </span>
        <p className="font-open-sans text-[15px] text-neutral">
          All pages are passing
        </p>
      </div>
    );
  }

  const entry = priorityPages[safeIndex];
  const page = data.pages.find((p) => p.pageId === entry.pageId);
  const result = page?.results[selectedDevice];

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px]">⚡</span>
          <span className="font-poppins font-bold text-[15px] text-on-surface">
            Needs attention
          </span>
          <span className="font-poppins font-bold text-[13px] text-on-surface bg-surface border border-border rounded-full px-2 py-0.5">
            {priorityPages.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {failingCount > 0 && (
            <span className="flex items-center gap-1 font-open-sans text-[13px] text-on-surface-dark">
              <span className="w-2 h-2 rounded-full bg-error inline-block" />
              {failingCount}
            </span>
          )}
          {niCount > 0 && (
            <span className="flex items-center gap-1 font-open-sans text-[13px] text-on-surface-dark">
              <span className="w-2 h-2 rounded-full bg-action inline-block" />
              {niCount}
            </span>
          )}
          {runFailedCount > 0 && (
            <span className="flex items-center gap-1 font-open-sans text-[13px] text-on-surface-dark">
              <span className="w-2 h-2 rounded-full bg-neutral inline-block" />
              {runFailedCount}
            </span>
          )}
        </div>
      </div>

      {/* Card */}
      {page && result ? (
        <AttentionCard
          page={page}
          result={result}
          entry={entry}
          selectedCategory={selectedCategory}
          onViewReport={onViewReport}
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 h-40 flex items-center justify-center">
          <p className="font-open-sans text-[14px] text-neutral">
            No data for this device
          </p>
        </div>
      )}

      {/* Carousel navigation */}
      {priorityPages.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-on-surface-dark hover:bg-surface-subtle disabled:opacity-30 transition-colors"
            aria-label="Previous page"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 2L4 6l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            {priorityPages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to card ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === safeIndex
                    ? "w-5 h-2.5 bg-primary"
                    : "w-2 h-2 bg-border hover:bg-neutral"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setCurrentIndex((i) => Math.min(priorityPages.length - 1, i + 1))
            }
            disabled={safeIndex === priorityPages.length - 1}
            className="w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-on-surface-dark hover:bg-surface-subtle disabled:opacity-30 transition-colors"
            aria-label="Next page"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AttentionCard ────────────────────────────────────────────────────────────

function AttentionCard({
  page,
  result,
  entry,
  selectedCategory,
  onViewReport,
}: {
  page: PageEntry;
  result: DeviceResult;
  entry: PriorityEntry;
  selectedCategory: string;
  onViewReport: (path: string) => void;
}) {
  const score =
    result.status === "run-failed"
      ? null
      : (result.scores[selectedCategory] ?? null);

  const statusLabel: Record<PageStatus, string> = {
    good: "Good",
    "needs-improvement": "Needs Improvement",
    failing: "Failing",
    "run-failed": "Run Failed",
  };

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
      {/* Top: gauge + page info */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <ScoreGauge
            score={score}
            label={formatCategoryName(selectedCategory)}
          />
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT_CLASS[entry.status]}`}
            />
            <span
              className={`font-open-sans font-bold text-[11px] uppercase tracking-wider ${STATUS_TEXT_CLASS[entry.status]}`}
            >
              {statusLabel[entry.status]}
            </span>
          </div>

          <h3 className="font-poppins font-bold text-[20px] text-on-surface leading-tight mb-0.5 truncate">
            {page.label}
          </h3>

          <p className="font-open-sans text-[11px] text-neutral uppercase tracking-wider mb-3">
            {page.group}
          </p>

          {result.reportHtmlPath && (
            <button
              onClick={() => onViewReport(result.reportHtmlPath)}
              className="font-open-sans font-bold text-[13px] text-on-surface hover:text-primary transition-colors flex items-center gap-0.5"
            >
              Full report
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6h7M6.5 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom: metrics row */}
      <div className="grid grid-cols-5 gap-2 border-t border-border pt-3">
        {(["lcp", "cls", "tbt", "fcp", "si"] as MetricKey[]).map((key) => (
          <CardMetricColumn
            key={key}
            metricKey={key}
            value={result.metrics[key]}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CardMetricColumn ─────────────────────────────────────────────────────────

function CardMetricColumn({
  metricKey,
  value,
}: {
  metricKey: MetricKey;
  value: number | null;
}) {
  const label = metricKey.toUpperCase();

  if (value === null) {
    return (
      <div className="flex flex-col gap-1">
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
    <div className="flex flex-col gap-1">
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

// ─── Metric helpers ───────────────────────────────────────────────────────────

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
  const maxVal: Record<MetricKey, number> = {
    lcp: 4000,
    cls: 0.25,
    tbt: 600,
    fcp: 3000,
    si: 7300,
  };
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

function getWorstMetricKey(metrics: DeviceResult["metrics"]): MetricKey | null {
  const keys: MetricKey[] = ["lcp", "cls", "tbt", "fcp", "si"];
  let worstKey: MetricKey | null = null;
  let worstRatio = 0;

  for (const key of keys) {
    const value = metrics[key];
    if (value === null) continue;
    const t = METRIC_THRESHOLDS[key];
    if (value > t.good) {
      const ratio = (value - t.good) / t.good;
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstKey = key;
      }
    }
  }
  return worstKey;
}

function generateInsightText(
  worstEntry: PriorityEntry | null,
  worstPage: PageEntry | null,
  worstResult: DeviceResult | null,
  _category: string,
  passingCount: number,
  totalPages: number,
): ReactNode {
  if (!worstEntry || !worstPage) {
    if (passingCount === totalPages) {
      return "All pages are passing every core vital. Great work!";
    }
    return "Some pages need attention on this device.";
  }

  if (worstEntry.status === "run-failed") {
    return (
      <>
        The audit for <strong>{worstPage.label}</strong> failed to run. Check
        the runner first.
      </>
    );
  }

  const worstMetric = worstResult
    ? getWorstMetricKey(worstResult.metrics)
    : null;

  if (worstMetric) {
    return (
      <>
        The set is held back by <strong>{worstPage.label}</strong>, whose{" "}
        <strong>{worstMetric.toUpperCase()}</strong> is deep in the red. Fix it
        first.
      </>
    );
  }

  return (
    <>
      <strong>{worstPage.label}</strong> needs the most attention. Fix it first.
    </>
  );
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

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Status color maps ────────────────────────────────────────────────────────

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

// ─── RecentReportsSection ─────────────────────────────────────────────────────

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
  return (
    <div className={isLast ? "" : "border-b border-border"}>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-subtle transition-colors cursor-pointer">
        <ScoreGauge
          score={
            result.status === "run-failed"
              ? null
              : (result.scores[selectedCategory] ?? null)
          }
          label={formatCategoryName(selectedCategory)}
        />
        <div className="w-[88px] flex-shrink-0 flex flex-col gap-0.5">
          {fetchTime ? (
            <>
              <span className="font-open-sans text-[11px] text-on-surface-dark leading-tight">
                {formatTimeAgo(fetchTime)}
              </span>
              <span className="font-open-sans text-[11px] text-neutral pl-[14px]">
                {formatClock(fetchTime)}
              </span>
            </>
          ) : (
            <span className="font-open-sans text-[11px] text-neutral">—</span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex gap-2 min-w-0">
            <span className="font-poppins font-bold text-[14px] text-on-surface truncate">
              {page.label}
            </span>
            <DeviceBadge device={device} />
          </div>
          <span className="label">{page.group}</span>
        </div>

        <MetricColumn metricKey="lcp" value={result.metrics.lcp} />
        <MetricColumn metricKey="cls" value={result.metrics.cls} />
        <MetricColumn metricKey="tbt" value={result.metrics.tbt} />
        <MetricColumn metricKey="fcp" value={result.metrics.fcp} />
        <MetricColumn metricKey="si" value={result.metrics.si} />

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

// ─── ScoreGauge ───────────────────────────────────────────────────────────────

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
            className="font-poppins font-bold text-lg leading-none"
            style={{ color }}
          >
            {score !== null ? score : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DeviceBadge ──────────────────────────────────────────────────────────────

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

// ─── MetricColumn (table row variant) ────────────────────────────────────────

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

// ─── ReportFrame ──────────────────────────────────────────────────────────────

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

// ─── StatusBadge (kept for test compatibility) ────────────────────────────────

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
