import { useState, useMemo } from "react";
import { useDashboardData } from "~/lib/useDashboardData";
import type { PageStatus, DashboardData } from "~/lib/dashboard.types";
import type { DashboardConfig } from "~/lib/config";
import { EhiButton } from "~/components/ui/EhiButton";
import { EhiDrawer } from "~/components/ui/EhiDrawer";
import { EhiSelect } from "~/components/ui/EhiSelect";

export default function Home({ config }: { config: DashboardConfig }) {
  const state = useDashboardData();
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>(
    config.devices[0] || "mobile"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    config.defaultCategory
  );

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
    <main className="min-h-screen bg-surface-canvas">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-poppins font-bold text-[32px] text-primary leading-tight">
            eVitals Dashboard
          </h1>
          <p className="font-open-sans text-[16px] text-on-surface-dark mt-2">
            {passingCount} / {totalPages} pages passing{" "}
            {formatCategoryName(selectedCategory)} ({selectedDevice}, latest run)
          </p>
        </header>

        {/* Controls */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <EhiSelect
            label="Device"
            value={selectedDevice}
            onValueChange={(value) => value && setSelectedDevice(value)}
            items={config.devices.map((device: string) => ({
              value: device,
              label: device.charAt(0).toUpperCase() + device.slice(1),
            }))}
          />
          <EhiSelect
            label="Category"
            value={selectedCategory}
            onValueChange={(value) => value && setSelectedCategory(value)}
            items={config.enabledCategories.map((category: string) => ({
              value: category,
              label: formatCategoryName(category),
            }))}
          />
        </div>

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
            onViewReport={setReportPath}
          />
        </div>

        {/* Most Recent Reports */}
        <div>
          <RecentReportsSection
            data={data}
            selectedDevice={selectedDevice}
            selectedCategory={selectedCategory}
            onViewReport={setReportPath}
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
        {reportPath && (
          <iframe
            src={reportPath}
            className="h-full w-full border-none"
            title="Lighthouse Report"
          />
        )}
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
              <StatusBadge status={topPriority.status} score={topPriority.score} />
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

function RecentReportsSection({
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
  const recentReports = useMemo(() => {
    return data.pages
      .flatMap((page) =>
        Object.entries(page.results).map(([device, result]) => ({
          page,
          device,
          result,
        }))
      )
      .filter(({ device }) => device === selectedDevice)
      .sort((a, b) => {
        const statusOrder = { "run-failed": 0, failing: 1, "needs-improvement": 2, good: 3 };
        const statusCompare =
          statusOrder[a.result.status as PageStatus] -
          statusOrder[b.result.status as PageStatus];
        if (statusCompare !== 0) return statusCompare;
        return (b.result.scores[selectedCategory] ?? 0) - (a.result.scores[selectedCategory] ?? 0);
      });
  }, [data.pages, selectedDevice, selectedCategory]);

  return (
    <section aria-label="Most recent reports">
      <h2 className="font-poppins font-bold text-[20px] text-on-surface mb-4">
        Most Recent Run
      </h2>
      <div className="space-y-3">
        {recentReports.map(({ page, device, result }) => (
          <div
            key={`${page.pageId}-${device}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <p className="font-poppins font-bold text-[16px] text-on-surface">
                {page.label}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="font-open-sans text-[14px] text-on-surface-dark">
                  {page.group}
                </span>
                <span className="font-open-sans text-[12px] text-neutral">
                  {device}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-poppins font-bold text-[24px] text-on-surface">
                  {result.scores[selectedCategory] ?? "-"}
                </div>
                <StatusBadge status={result.status} score={result.scores[selectedCategory] ?? 0} />
              </div>
              {result.reportHtmlPath && (
                <EhiButton
                  variant="link"
                  onClick={() => onViewReport(result.reportHtmlPath)}
                >
                  View Report
                </EhiButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
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
