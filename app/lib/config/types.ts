import type { z } from "zod";
import type {
  PageEntrySchema,
  PageRegistrySchema,
  DashboardConfigSchema,
} from "./schemas";

/** A single page entry from `urls.config.json`. */
export type PageEntry = z.infer<typeof PageEntrySchema>;

/** The full page registry — validated array of unique page entries. */
export type PageRegistry = z.infer<typeof PageRegistrySchema>;

/** Validated dashboard configuration from `dashboard.config.json`. */
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

/** A single structured validation error pointing at a specific field. */
export interface ConfigError {
  /** Dot-notation field path, e.g. `"0.id"` or `"defaultCategory"`. */
  field: string;
  message: string;
}

/** Discriminated union result returned by all parse functions. */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ConfigError[] };
