import { describe, it, expect } from "vitest";
import type { ZodIssue } from "zod";
import {
  parsePageRegistry,
  parseDashboardConfig,
  PageRegistryEntrySchema,
  DashboardConfigSchema,
} from "~/lib/config.schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SafeResult =
  | { success: true }
  | { success: false; error: { issues: ZodIssue[] } };

function errPaths(result: SafeResult): string[] {
  if (result.success) return [];
  return result.error.issues.map((i: ZodIssue) => i.path.join("."));
}

function errMessages(result: SafeResult): string[] {
  if (result.success) return [];
  return result.error.issues.map((i: ZodIssue) => i.message);
}

// ─── Page Registry ────────────────────────────────────────────────────────────

const VALID_ENTRY = {
  id: "homepage",
  label: "Homepage",
  url: "https://www.ehealthinsurance.com/",
  group: "core",
};

describe("parsePageRegistry", () => {
  describe("valid inputs", () => {
    it("accepts a well-formed single entry array and returns typed output", () => {
      const result = parsePageRegistry([VALID_ENTRY]);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(VALID_ENTRY);
    });

    it("accepts multiple valid entries with distinct ids", () => {
      const result = parsePageRegistry([
        VALID_ENTRY,
        { id: "plans", label: "Plans", url: "https://www.ehealthinsurance.com/plans", group: "core" },
      ]);
      expect(result.success).toBe(true);
    });

    it("accepts an empty array (zero pages configured)", () => {
      const result = parsePageRegistry([]);
      expect(result.success).toBe(true);
    });

    it("accepts HTTPS and HTTP URLs", () => {
      const result = parsePageRegistry([
        { ...VALID_ENTRY, url: "http://example.com/" },
      ]);
      expect(result.success).toBe(true);
    });
  });

  describe("required fields", () => {
    it("rejects entry missing id", () => {
      const { id: _id, ...noId } = VALID_ENTRY;
      const result = parsePageRegistry([noId]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.id");
    });

    it("rejects entry missing label", () => {
      const { label: _label, ...noLabel } = VALID_ENTRY;
      const result = parsePageRegistry([noLabel]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.label");
    });

    it("rejects entry missing url", () => {
      const { url: _url, ...noUrl } = VALID_ENTRY;
      const result = parsePageRegistry([noUrl]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.url");
    });

    it("rejects entry missing group", () => {
      const { group: _group, ...noGroup } = VALID_ENTRY;
      const result = parsePageRegistry([noGroup]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.group");
    });

    it("rejects entry with empty-string id", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, id: "" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.id");
    });

    it("rejects entry with empty-string label", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, label: "" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.label");
    });

    it("rejects entry with empty-string group", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, group: "" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.group");
    });
  });

  describe("URL validity", () => {
    it("rejects a plain string that is not a URL", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, url: "not-a-url" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.url");
    });

    it("rejects a relative path as url", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, url: "/relative/path" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.url");
    });

    it("rejects an empty-string url", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, url: "" }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.url");
    });

    it("rejects a numeric url field", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, url: 12345 }]);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("0.url");
    });
  });

  describe("id uniqueness", () => {
    it("rejects two entries with the same id", () => {
      const result = parsePageRegistry([VALID_ENTRY, { ...VALID_ENTRY }]);
      expect(result.success).toBe(false);
      const messages = errMessages(result);
      expect(messages.some((m) => m.includes(`Duplicate id: "homepage"`))).toBe(true);
    });

    it("rejects three entries where the second and third share an id", () => {
      const result = parsePageRegistry([
        { ...VALID_ENTRY, id: "a" },
        { ...VALID_ENTRY, id: "b" },
        { ...VALID_ENTRY, id: "b" },
      ]);
      expect(result.success).toBe(false);
      const messages = errMessages(result);
      expect(messages.some((m) => m.includes(`Duplicate id: "b"`))).toBe(true);
    });

    it("accepts entries with distinct ids (uniqueness passes)", () => {
      const result = parsePageRegistry([
        { ...VALID_ENTRY, id: "a" },
        { ...VALID_ENTRY, id: "b" },
        { ...VALID_ENTRY, id: "c" },
      ]);
      expect(result.success).toBe(true);
    });
  });

  describe("unknown fields", () => {
    it("rejects entries with unrecognised extra fields (strict schema)", () => {
      const result = parsePageRegistry([{ ...VALID_ENTRY, devices: ["mobile"] }]);
      expect(result.success).toBe(false);
    });
  });

  describe("non-object inputs", () => {
    it("rejects null", () => {
      expect(parsePageRegistry(null).success).toBe(false);
    });

    it("rejects a plain string", () => {
      expect(parsePageRegistry("[]").success).toBe(false);
    });

    it("rejects an object instead of array", () => {
      expect(parsePageRegistry(VALID_ENTRY).success).toBe(false);
    });
  });
});

// ─── Dashboard Config ─────────────────────────────────────────────────────────

const VALID_CONFIG = {
  defaultCategory: "performance" as const,
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"] as const,
  devices: ["mobile", "desktop"] as const,
  historyLimit: 30,
  basePath: "/eVitals/",
};

describe("parseDashboardConfig", () => {
  describe("valid inputs", () => {
    it("accepts the canonical dashboard.config.json shape", () => {
      const result = parseDashboardConfig(VALID_CONFIG);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.defaultCategory).toBe("performance");
      expect(result.data.historyLimit).toBe(30);
    });

    it("accepts a minimal config with a single category and single device", () => {
      const result = parseDashboardConfig({
        defaultCategory: "accessibility",
        enabledCategories: ["accessibility"],
        devices: ["mobile"],
        historyLimit: 10,
        basePath: "/app/",
      });
      expect(result.success).toBe(true);
    });

    it("accepts historyLimit of 1", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, historyLimit: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("required fields", () => {
    it("rejects config missing defaultCategory", () => {
      const { defaultCategory: _dc, ...noDC } = VALID_CONFIG;
      const result = parseDashboardConfig(noDC);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("defaultCategory");
    });

    it("rejects config missing enabledCategories", () => {
      const { enabledCategories: _ec, ...noEC } = VALID_CONFIG;
      const result = parseDashboardConfig(noEC);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("enabledCategories");
    });

    it("rejects config missing devices", () => {
      const { devices: _d, ...noDevices } = VALID_CONFIG;
      const result = parseDashboardConfig(noDevices);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("devices");
    });

    it("rejects config missing historyLimit", () => {
      const { historyLimit: _hl, ...noHL } = VALID_CONFIG;
      const result = parseDashboardConfig(noHL);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("historyLimit");
    });

    it("rejects config missing basePath", () => {
      const { basePath: _bp, ...noBP } = VALID_CONFIG;
      const result = parseDashboardConfig(noBP);
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("basePath");
    });
  });

  describe("invalid values — defaultCategory", () => {
    it("rejects an unknown category string", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, defaultCategory: "ux" });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("defaultCategory");
    });

    it("rejects defaultCategory not present in enabledCategories", () => {
      const result = parseDashboardConfig({
        ...VALID_CONFIG,
        defaultCategory: "seo",
        enabledCategories: ["performance", "accessibility"],
      });
      expect(result.success).toBe(false);
      const messages = errMessages(result);
      expect(messages.some((m) => m.includes("defaultCategory"))).toBe(true);
    });
  });

  describe("invalid values — enabledCategories", () => {
    it("rejects an empty enabledCategories array", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, enabledCategories: [] });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("enabledCategories");
    });

    it("rejects an unknown category value in the array", () => {
      const result = parseDashboardConfig({
        ...VALID_CONFIG,
        enabledCategories: ["performance", "unknown-cat"],
      });
      expect(result.success).toBe(false);
      expect(errPaths(result).some((p) => p.startsWith("enabledCategories"))).toBe(true);
    });
  });

  describe("invalid values — devices", () => {
    it("rejects an empty devices array", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, devices: [] });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("devices");
    });

    it("rejects an unknown device value", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, devices: ["tablet"] });
      expect(result.success).toBe(false);
      expect(errPaths(result).some((p) => p.startsWith("devices"))).toBe(true);
    });
  });

  describe("invalid values — historyLimit", () => {
    it("rejects historyLimit of 0", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, historyLimit: 0 });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("historyLimit");
    });

    it("rejects a negative historyLimit", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, historyLimit: -5 });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("historyLimit");
    });

    it("rejects a fractional historyLimit", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, historyLimit: 2.5 });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("historyLimit");
    });

    it("rejects a string historyLimit", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, historyLimit: "30" });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("historyLimit");
    });
  });

  describe("invalid values — basePath", () => {
    it("rejects an empty basePath string", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, basePath: "" });
      expect(result.success).toBe(false);
      expect(errPaths(result)).toContain("basePath");
    });
  });

  describe("unknown fields", () => {
    it("rejects configs with unrecognised extra fields (strict schema)", () => {
      const result = parseDashboardConfig({ ...VALID_CONFIG, unknownOption: true });
      expect(result.success).toBe(false);
    });
  });

  describe("error message quality", () => {
    it("provides field-level error messages for invalid inputs", () => {
      const result = parseDashboardConfig({
        ...VALID_CONFIG,
        historyLimit: -1,
        defaultCategory: "invalid-cat",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.length).toBeGreaterThan(0);
      result.error.issues.forEach((issue) => {
        expect(issue.path.length).toBeGreaterThan(0);
        expect(typeof issue.message).toBe("string");
        expect(issue.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe("non-object inputs", () => {
    it("rejects null", () => {
      expect(parseDashboardConfig(null).success).toBe(false);
    });

    it("rejects an array", () => {
      expect(parseDashboardConfig([VALID_CONFIG]).success).toBe(false);
    });

    it("rejects a plain string", () => {
      expect(parseDashboardConfig("{}").success).toBe(false);
    });
  });
});

// ─── Schema type exports ──────────────────────────────────────────────────────

describe("schema type exports", () => {
  it("PageRegistryEntrySchema has shape with all four required keys", () => {
    const keys = Object.keys(PageRegistryEntrySchema.shape);
    expect(keys).toEqual(expect.arrayContaining(["id", "label", "url", "group"]));
    expect(keys).toHaveLength(4);
  });

  it("DashboardConfigSchema has shape with all five required keys", () => {
    const keys = Object.keys(DashboardConfigSchema.shape);
    expect(keys).toEqual(
      expect.arrayContaining([
        "defaultCategory",
        "enabledCategories",
        "devices",
        "historyLimit",
        "basePath",
      ])
    );
    expect(keys).toHaveLength(5);
  });
});
