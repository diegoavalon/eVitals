import { z } from "zod";

// ─── Page Registry ────────────────────────────────────────────────────────────

export const PageRegistryEntrySchema = z
  .object({
    id: z.string().min(1, "id must not be empty"),
    label: z.string().min(1, "label must not be empty"),
    url: z.string().url("url must be a valid URL"),
    group: z.string().min(1, "group must not be empty"),
  })
  .strict();

export type PageRegistryEntry = z.infer<typeof PageRegistryEntrySchema>;

export const PageRegistrySchema = z
  .array(PageRegistryEntrySchema)
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();
    entries.forEach((entry, i) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate id: "${entry.id}"`,
          path: [i, "id"],
        });
      }
      seen.add(entry.id);
    });
  });

export type PageRegistry = z.infer<typeof PageRegistrySchema>;

export function parsePageRegistry(raw: unknown) {
  return PageRegistrySchema.safeParse(raw);
}

// ─── Dashboard Config ─────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

export const VALID_DEVICES = ["mobile", "desktop"] as const;

export const DashboardConfigSchema = z
  .object({
    defaultCategory: z.enum(VALID_CATEGORIES),
    enabledCategories: z
      .array(z.enum(VALID_CATEGORIES))
      .min(1, "enabledCategories must contain at least one category"),
    devices: z
      .array(z.enum(VALID_DEVICES))
      .min(1, "devices must contain at least one device"),
    historyLimit: z
      .number()
      .int("historyLimit must be an integer")
      .positive("historyLimit must be positive"),
    basePath: z.string().min(1, "basePath must not be empty"),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (!config.enabledCategories.includes(config.defaultCategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultCategory "${config.defaultCategory}" must be present in enabledCategories`,
        path: ["defaultCategory"],
      });
    }
  });

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

export function parseDashboardConfig(raw: unknown) {
  return DashboardConfigSchema.safeParse(raw);
}
