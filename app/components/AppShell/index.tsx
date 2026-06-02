import type { ReactNode } from "react";
import type { DashboardConfig } from "~/lib/config";
import { DashboardFiltersProvider } from "~/lib/DashboardFiltersContext";
import { AppHeader } from "../AppHeader";

export function AppShell({
  config,
  children,
}: {
  config: DashboardConfig;
  children: ReactNode;
}) {
  return (
    <DashboardFiltersProvider config={config}>
      <div className="flex min-h-screen flex-col bg-surface-canvas">
        <AppHeader />
        <div className="flex-1">{children}</div>
      </div>
    </DashboardFiltersProvider>
  );
}
