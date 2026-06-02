import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { DashboardConfig } from "./config";

type DashboardFilters = {
  selectedDevice: string;
  setSelectedDevice: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  config: DashboardConfig;
};

const DashboardFiltersContext = createContext<DashboardFilters | null>(null);

export function DashboardFiltersProvider({
  config,
  children,
}: {
  config: DashboardConfig;
  children: ReactNode;
}) {
  const [selectedDevice, setSelectedDevice] = useState<string>(
    config.devices[0] ?? "mobile",
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    config.defaultCategory,
  );

  return (
    <DashboardFiltersContext.Provider
      value={{ selectedDevice, setSelectedDevice, selectedCategory, setSelectedCategory, config }}
    >
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFilters {
  const ctx = useContext(DashboardFiltersContext);
  if (!ctx) throw new Error("useDashboardFilters must be used within DashboardFiltersProvider");
  return ctx;
}
