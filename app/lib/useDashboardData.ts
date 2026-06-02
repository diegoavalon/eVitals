import { useEffect, useState } from "react";
import type { DashboardData, FetchState } from "./dashboard.types";

function dataUrl(): string {
  // BASE_URL is set by Vite to the configured base path (e.g. "/eVitals/").
  // In tests (Vitest), it defaults to "/".
  return `${import.meta.env.BASE_URL}data/dashboardData.json`;
}

function isValidDashboardData(value: unknown): value is DashboardData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.generatedAt === "string" &&
    typeof obj.runId === "string" &&
    Array.isArray(obj.enabledCategories) &&
    typeof obj.summary === "object" &&
    obj.summary !== null &&
    typeof obj.aggregates === "object" &&
    obj.aggregates !== null &&
    Array.isArray(obj.priority) &&
    typeof obj.recentRunHistoryByPage === "object" &&
    obj.recentRunHistoryByPage !== null &&
    Array.isArray(obj.pages)
  );
}

export function useDashboardData(): FetchState<DashboardData> {
  const [state, setState] = useState<FetchState<DashboardData>>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    fetch(dataUrl())
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setState({ status: "missing" });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        if (isValidDashboardData(data)) {
          setState({ status: "success", data });
        } else {
          setState({ status: "invalid" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "missing" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
