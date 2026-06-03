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
import { EhiSelect } from "~/components/ui/EhiSelect";
import { useDashboardFilters } from "~/lib/DashboardFiltersContext";
import { withBasePath } from "~/lib/url";

export default function AllPages() {
  const state = useDashboardData();
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PageStatus | "all">("all");
  const { selectedDevice } = useDashboardFilters();

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
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Page headline */}
        <header className="mb-8">
          <h1 className="font-poppins font-bold text-[32px] text-primary leading-tight">
            All Pages
          </h1>
          <p className="font-open-sans text-[16px] text-on-surface-dark mt-2">
            Audit results for {data.pages.length} configured pages ({selectedDevice})
          </p>
        </header>

        {/* Filter Controls */}
        <div className="mb-8 flex gap-4">
          <div className="w-64">
            <EhiSelect
              label="Filter by Status"
              value={statusFilter}
              onValueChange={(val) => setStatusFilter((val ?? "all") as PageStatus | "all")}
              items={[
                { value: "all", label: "All Statuses" },
                { value: "good", label: "Passing" },
                { value: "needs-improvement", label: "Needs Improvement" },
                { value: "failing", label: "Failing" },
                { value: "run-failed", label: "Run Failed" },
              ]}
            />
          </div>
        </div>

        {/* Pages Grouped */}
        <div className="space-y-6">
          <PageGroupedTable
            data={data}
            selectedDevice={selectedDevice}
            statusFilter={statusFilter}
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

interface GroupedPageData {
  groupLabel: string;
  pages: Array<{
    page: PageEntry;
    result: DeviceResult;
    history: { time: number; lcp: number | null; status: PageStatus }[];
    latestFetchTime: string | null;
  }>;
}

function PageGroupedTable({
  data,
  selectedDevice,
  statusFilter,
  onViewReport,
}: {
  data: DashboardData;
  selectedDevice: string;
  statusFilter: PageStatus | "all";
  onViewReport: (path: string) => void;
}) {
  const groupedPages = useMemo(() => {
    const groups = new Map<string, GroupedPageData>();

    data.pages.forEach((page) => {
      const result = page.results[selectedDevice];
      if (!result) return;

      const shouldShow =
        statusFilter === "all" || result.status === statusFilter;
      if (!shouldShow) return;

      const history = (data.recentRunHistoryByPage[page.pageId] ?? [])
        .filter((h) => h.device === selectedDevice)
        .sort(
          (a, b) =>
            new Date(a.fetchTime).getTime() - new Date(b.fetchTime).getTime(),
        )
        .map((h) => ({
          time: new Date(h.fetchTime).getTime(),
          lcp: h.lcp,
          status: h.status,
        }));

      const latestEntry = history[history.length - 1];
      const latestFetchTime = latestEntry
        ? new Date(latestEntry.time).toISOString()
        : null;

      if (!groups.has(page.group)) {
        groups.set(page.group, {
          groupLabel: page.group,
          pages: [],
        });
      }

      groups.get(page.group)!.pages.push({
        page,
        result,
        history,
        latestFetchTime,
      });
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.groupLabel.localeCompare(b.groupLabel),
    );
  }, [data, selectedDevice, statusFilter]);

  if (groupedPages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-open-sans text-[16px] text-neutral">
          No pages found for the selected filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedPages.map((group) => (
        <PageGroup
          key={group.groupLabel}
          group={group}
          onViewReport={onViewReport}
        />
      ))}
    </div>
  );
}

function PageGroup({
  group,
  onViewReport,
}: {
  group: GroupedPageData;
  onViewReport: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-surface p-4 flex items-center justify-between hover:bg-surface-subtle transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <h2 className="font-poppins font-bold text-[18px] text-on-surface">
          {formatGroupName(group.groupLabel)}
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-open-sans text-[14px] text-neutral">
            {group.pages.length} page{group.pages.length !== 1 ? "s" : ""}
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-on-surface transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div>
          {group.pages.map((item, idx) => (
            <PageRow
              key={`${item.page.pageId}-${idx}`}
              page={item.page}
              result={item.result}
              history={item.history}
              latestFetchTime={item.latestFetchTime}
              isLast={idx === group.pages.length - 1}
              onViewReport={onViewReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageRow({
  page,
  result,
  history,
  latestFetchTime,
  isLast,
  onViewReport,
}: {
  page: PageEntry;
  result: DeviceResult;
  history: { time: number; lcp: number | null; status: PageStatus }[];
  latestFetchTime: string | null;
  isLast: boolean;
  onViewReport: (path: string) => void;
}) {
  const isFailing =
    result.status === "failing" || result.status === "run-failed";

  return (
    <div
      className={`${isLast ? "" : "border-b border-border"} ${
        isFailing ? "bg-surface-muted" : "bg-surface"
      }`}
    >
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Page name */}
        <div className="flex-1 min-w-0">
          <p className="font-poppins font-bold text-[14px] text-on-surface truncate">
            {page.label}
          </p>
          <p className="font-open-sans text-[12px] text-neutral mt-1">
            {page.url}
          </p>
        </div>

        {/* Score badge */}
        <div className="flex-shrink-0 w-16">
          <ScoreGauge
            score={
              result.status === "run-failed"
                ? null
                : result.scores.performance ?? null
            }
          />
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          <StatusBadge status={result.status} score={result.scores.performance} />
        </div>

        {/* Sparkline */}
        <div className="flex-shrink-0 w-32">
          <LcpSparkline
            data={history}
            status={result.status === "failing" ? "failing" : "good"}
          />
        </div>

        {/* Delta indicator */}
        <div className="flex-shrink-0 w-20">
          <DeltaIndicator history={history} />
        </div>

        {/* View Report button */}
        {result.reportHtmlPath ? (
          <EhiButton
            variant="link"
            onClick={() => onViewReport(result.reportHtmlPath)}
          >
            Full Report
          </EhiButton>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </div>
  );
}

// ─── Score Gauge Component ────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number | null }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const status = score !== null ? scoreToStatus(score) : "run-failed";
  const color = STROKE_COLORS[status];
  const filled = score !== null ? (score / 100) * circumference : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="4"
          />
          {score !== null && (
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center gap-1 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span
            className="font-poppins font-bold text-[14px] leading-none"
            style={{ color }}
          >
            {score !== null ? score : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── LCP Sparkline Component ──────────────────────────────────────────────────

function LcpSparkline({
  data,
  status,
}: {
  data: { time: number; lcp: number | null; status: PageStatus }[];
  status: "good" | "failing";
}) {
  if (data.length === 0) {
    return (
      <div className="text-center">
        <span className="font-open-sans text-[12px] text-neutral">—</span>
      </div>
    );
  }

  const validLcpValues = data
    .map((d) => d.lcp)
    .filter((lcp): lcp is number => lcp !== null);

  if (validLcpValues.length === 0) {
    return (
      <div className="text-center">
        <span className="font-open-sans text-[12px] text-neutral">No data</span>
      </div>
    );
  }

  const maxLcp = Math.max(...validLcpValues);
  const minLcp = Math.min(...validLcpValues);
  const range = maxLcp - minLcp || 1;

  const points = data
    .map((d, i) => {
      if (d.lcp === null) return null;
      const normalized = (d.lcp - minLcp) / range;
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - normalized * 80;
      return { x, y };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="h-12 flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full"
      >
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={status === "failing" ? "#b8000f" : "#0c6e1e"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// ─── Delta Indicator Component ────────────────────────────────────────────────

function DeltaIndicator({
  history,
}: {
  history: { time: number; lcp: number | null; status: PageStatus }[];
}) {
  if (history.length < 2) {
    return (
      <div className="text-center">
        <span className="font-open-sans text-[12px] text-neutral">—</span>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  if (latest?.lcp === null || previous?.lcp === null) {
    return (
      <div className="text-center">
        <span className="font-open-sans text-[12px] text-neutral">—</span>
      </div>
    );
  }

  const delta = latest.lcp - previous.lcp;
  const deltaPercent = ((delta / previous.lcp) * 100).toFixed(0);
  const isImprovement = delta < 0;

  return (
    <div className="text-center flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        {isImprovement ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary flex-shrink-0"
            aria-hidden="true"
          >
            <path d="M2 9l3-3 3 3" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-error flex-shrink-0"
            aria-hidden="true"
          >
            <path d="M2 5l3 3 3-3" />
          </svg>
        )}
        <span
          className={`font-poppins font-bold text-[12px] ${
            isImprovement ? "text-primary" : "text-error"
          }`}
        >
          {isImprovement ? "-" : "+"}
          {Math.abs(parseInt(deltaPercent))}%
        </span>
      </div>
    </div>
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────

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

// ─── Utility Functions ────────────────────────────────────────────────────────

function scoreToStatus(score: number | null): PageStatus {
  if (score === null) return "run-failed";
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "failing";
}

function formatGroupName(group: string): string {
  return group
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const STROKE_COLORS: Record<PageStatus, string> = {
  good: "#0c6e1e",
  "needs-improvement": "#fa6200",
  failing: "#b8000f",
  "run-failed": "#666666",
};

function ReportFrame({ src }: { src: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  function handleLoad() {
    try {
      const title = iframeRef.current?.contentDocument?.title ?? "";
      setFrameStatus(title === "Lighthouse Report" ? "ready" : "missing");
    } catch {
      setFrameStatus("ready");
    }
  }

  return (
    <div className="relative h-full w-full">
      {frameStatus === "loading" && (
        <div className="flex h-full items-center justify-center">
          <p className="font-open-sans text-[16px] text-neutral">
            Loading report…
          </p>
        </div>
      )}
      {frameStatus === "missing" && <ReportEmptyState />}
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={handleLoad}
        className={`h-full w-full border-none${frameStatus !== "ready" ? " hidden" : ""}`}
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
