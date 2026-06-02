import { useEffect, useState } from "react";
import { parseDashboardConfig } from "./config";
import type { DashboardConfig, ConfigError } from "./config";

export type ConfigState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "invalid"; errors: ConfigError[] }
  | { status: "ready"; config: DashboardConfig };

function configUrl(): string {
  return `${import.meta.env.BASE_URL}data/dashboard.config.json`;
}

/**
 * Loads and validates `dashboard.config.json` at app bootstrap.
 * Returns a discriminated state that callers must handle before rendering
 * config-dependent UI.
 */
export function useDashboardConfig(): ConfigState {
  const [state, setState] = useState<ConfigState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(configUrl())
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setState({ status: "missing" });
          return null;
        }
        return res.json();
      })
      .then((raw) => {
        if (cancelled || raw === null) return;
        const result = parseDashboardConfig(raw);
        if (result.success) {
          setState({ status: "ready", config: result.data });
        } else {
          setState({ status: "invalid", errors: result.errors });
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
