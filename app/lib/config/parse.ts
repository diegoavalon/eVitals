import { z } from "zod";
import { PageRegistrySchema, DashboardConfigSchema } from "./schemas";
import type { PageRegistry, DashboardConfig, ConfigError, ParseResult } from "./types";

function mapZodErrors(error: z.ZodError): ConfigError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

/**
 * Parse and validate raw JSON input against the page registry schema.
 *
 * - Strips unknown fields on each entry.
 * - Enforces unique `id` values across entries.
 * - Returns typed `PageRegistry` on success, or structured `ConfigError[]` on failure.
 *
 * @example
 * const result = parsePageRegistry(rawJson);
 * if (!result.success) {
 *   result.errors.forEach(e => console.error(`${e.field}: ${e.message}`));
 * }
 */
export function parsePageRegistry(raw: unknown): ParseResult<PageRegistry> {
  const result = PageRegistrySchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: mapZodErrors(result.error) };
}

/**
 * Parse and validate raw JSON input against the dashboard config schema.
 *
 * - Strips unknown fields.
 * - Applies defaults for `historyLimit` (30) and `basePath` ("/eVitals/") when absent.
 * - Returns typed `DashboardConfig` on success, or structured `ConfigError[]` on failure.
 *
 * @example
 * const result = parseDashboardConfig(rawJson);
 * if (!result.success) {
 *   result.errors.forEach(e => console.error(`${e.field}: ${e.message}`));
 * }
 */
export function parseDashboardConfig(
  raw: unknown,
): ParseResult<DashboardConfig> {
  const result = DashboardConfigSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: mapZodErrors(result.error) };
}
