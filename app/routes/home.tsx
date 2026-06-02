import { useDashboardData } from "~/lib/useDashboardData";
import type { PageStatus } from "~/lib/dashboard.types";

export default function Home() {
  const state = useDashboardData();

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
  const mobileResults = data.pages.flatMap((p) =>
    Object.entries(p.results)
      .filter(([device]) => device === "mobile")
      .map(([, r]) => r),
  );
  const passingCount = mobileResults.filter((r) => r.status === "good").length;
  const total = data.pages.length;

  return (
    <main className="p-8 bg-surface-canvas min-h-screen">
      <header className="mb-8">
        <h1 className="font-poppins font-bold text-[24px] text-primary leading-tight">
          eVitals Dashboard
        </h1>
        <p className="font-open-sans text-[16px] text-on-surface-dark mt-1">
          {passingCount} / {total} pages passing Performance (mobile, latest
          run)
        </p>
      </header>

      <section aria-label="Page results">
        <h2 className="font-poppins font-bold text-[18px] text-on-surface mb-4">
          Most Recent Run
        </h2>
        <ul className="space-y-3">
          {data.pages.map((page) => {
            const mobile = page.results["mobile"];
            return (
              <li
                key={page.pageId}
                className="flex items-center justify-between p-4 rounded-md border border-border bg-surface"
              >
                <div>
                  <span className="font-poppins font-bold text-[14px] text-on-surface">
                    {page.label}
                  </span>
                  <span className="ml-2 font-open-sans text-[12px] text-neutral">
                    {page.group}
                  </span>
                </div>
                {mobile && (
                  <StatusBadge status={mobile.status} score={mobile.scores["performance"]} />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

function StatusBadge({
  status,
  score,
}: {
  status: PageStatus;
  score: number;
}) {
  const colorClass: Record<PageStatus, string> = {
    good: "text-primary",
    "needs-improvement": "text-warning",
    failing: "text-error",
    "run-failed": "text-neutral",
  };
  const label: Record<PageStatus, string> = {
    good: "Good",
    "needs-improvement": "Needs Improvement",
    failing: "Failing",
    "run-failed": "Run Failed",
  };
  return (
    <span
      className={`font-open-sans font-bold text-[12px] ${colorClass[status]}`}
    >
      {label[status]} ({score})
    </span>
  );
}
