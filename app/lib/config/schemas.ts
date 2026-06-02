import { z } from "zod";

// ---------------------------------------------------------------------------
// Page Registry — urls.config.json
// ---------------------------------------------------------------------------

export const PageEntrySchema = z
  .object({
    id: z.string().min(1, "Page id is required"),
    label: z.string().min(1, "Page label is required"),
    url: z.string().url("Page url must be a valid URL"),
    group: z.string().min(1, "Page group is required"),
  })
  .strip();

/**
 * Full page registry: array of page entries with unique id enforcement.
 * Unknown keys on each entry are stripped.
 */
export const PageRegistrySchema = z
  .array(PageEntrySchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate page id: "${item.id}"`,
          path: [index, "id"],
        });
      }
      seen.add(item.id);
    });
  });

// ---------------------------------------------------------------------------
// Dashboard Config — dashboard.config.json
// ---------------------------------------------------------------------------

export const LIGHTHOUSE_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

export const DEVICES = ["mobile", "desktop"] as const;

export const DashboardConfigSchema = z
  .object({
    defaultCategory: z.enum(LIGHTHOUSE_CATEGORIES, {
      error: `defaultCategory must be one of: ${LIGHTHOUSE_CATEGORIES.join(", ")}`,
    }),
    enabledCategories: z
      .array(z.enum(LIGHTHOUSE_CATEGORIES))
      .min(1, "At least one category must be enabled"),
    devices: z
      .array(z.enum(DEVICES))
      .min(1, "At least one device must be enabled"),
    historyLimit: z
      .number()
      .int("historyLimit must be an integer")
      .positive("historyLimit must be a positive integer")
      .default(30),
    basePath: z.string().min(1, "basePath is required").default("/eVitals/"),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (!data.enabledCategories.includes(data.defaultCategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultCategory "${data.defaultCategory}" must be included in enabledCategories`,
        path: ["defaultCategory"],
      });
    }
  });
