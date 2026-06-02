/**
 * Config validation module.
 *
 * Provides Zod-backed parse functions for:
 * - `urls.config.json` (page registry)
 * - `dashboard.config.json` (dashboard runtime configuration)
 *
 * @example
 * import { parsePageRegistry, parseDashboardConfig } from "~/lib/config";
 *
 * const registry = parsePageRegistry(rawJson);
 * if (!registry.success) { registry.errors.forEach(e => console.error(e.field, e.message)); }
 *
 * const config = parseDashboardConfig(rawJson);
 * if (config.success) { console.log(config.data.defaultCategory); }
 */
export { parsePageRegistry, parseDashboardConfig } from "./parse";
export { PageEntrySchema, PageRegistrySchema, DashboardConfigSchema, LIGHTHOUSE_CATEGORIES, DEVICES } from "./schemas";
export type { PageEntry, PageRegistry, DashboardConfig, ConfigError, ParseResult } from "./types";
