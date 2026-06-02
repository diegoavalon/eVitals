import { describe, it, expect } from "vitest";
import { parseDashboardConfig } from "~/lib/config";

const validConfig = {
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  historyLimit: 30,
  basePath: "/eVitals/",
};

describe("parseDashboardConfig — valid inputs", () => {
  it("accepts a fully-specified valid config", () => {
    const result = parseDashboardConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultCategory).toBe("performance");
      expect(result.data.enabledCategories).toEqual(["performance", "accessibility", "best-practices", "seo"]);
      expect(result.data.devices).toEqual(["mobile", "desktop"]);
      expect(result.data.historyLimit).toBe(30);
      expect(result.data.basePath).toBe("/eVitals/");
    }
  });

  it("applies default historyLimit (30) when absent", () => {
    const { historyLimit: _hl, ...rest } = validConfig;
    const result = parseDashboardConfig(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.historyLimit).toBe(30);
    }
  });

  it("applies default basePath ('/eVitals/') when absent", () => {
    const { basePath: _bp, ...rest } = validConfig;
    const result = parseDashboardConfig(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePath).toBe("/eVitals/");
    }
  });

  it("accepts a subset of enabled categories", () => {
    const result = parseDashboardConfig({ ...validConfig, enabledCategories: ["performance"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabledCategories).toEqual(["performance"]);
    }
  });

  it("accepts a single device", () => {
    const result = parseDashboardConfig({ ...validConfig, devices: ["mobile"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.devices).toEqual(["mobile"]);
    }
  });

  it("strips unknown extra fields", () => {
    const withExtra = { ...validConfig, unknownField: "ignore-me" };
    const result = parseDashboardConfig(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unknownField");
    }
  });

  it("accepts non-default custom historyLimit", () => {
    const result = parseDashboardConfig({ ...validConfig, historyLimit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.historyLimit).toBe(10);
    }
  });
});

describe("parseDashboardConfig — invalid inputs", () => {
  it("rejects missing defaultCategory", () => {
    const { defaultCategory: _dc, ...rest } = validConfig;
    const result = parseDashboardConfig(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("defaultCategory"))).toBe(true);
    }
  });

  it("rejects an invalid defaultCategory value", () => {
    const result = parseDashboardConfig({ ...validConfig, defaultCategory: "unknown-category" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("defaultCategory"));
      expect(err).toBeDefined();
    }
  });

  it("rejects an invalid category in enabledCategories", () => {
    const result = parseDashboardConfig({
      ...validConfig,
      enabledCategories: ["performance", "invalid-cat"],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("enabledCategories"))).toBe(true);
    }
  });

  it("rejects empty enabledCategories array", () => {
    const result = parseDashboardConfig({ ...validConfig, enabledCategories: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("enabledCategories"));
      expect(err).toBeDefined();
    }
  });

  it("rejects an invalid device value", () => {
    const result = parseDashboardConfig({ ...validConfig, devices: ["tablet"] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("devices"))).toBe(true);
    }
  });

  it("rejects empty devices array", () => {
    const result = parseDashboardConfig({ ...validConfig, devices: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("devices"));
      expect(err).toBeDefined();
    }
  });

  it("rejects a non-integer historyLimit", () => {
    const result = parseDashboardConfig({ ...validConfig, historyLimit: 3.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("historyLimit"));
      expect(err).toBeDefined();
      expect(err!.message).toMatch(/integer/i);
    }
  });

  it("rejects a non-positive historyLimit", () => {
    const result = parseDashboardConfig({ ...validConfig, historyLimit: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("historyLimit"));
      expect(err).toBeDefined();
      expect(err!.message).toMatch(/positive/i);
    }
  });

  it("rejects a negative historyLimit", () => {
    const result = parseDashboardConfig({ ...validConfig, historyLimit: -5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.errors.find((e) => e.field.includes("historyLimit"));
      expect(err).toBeDefined();
    }
  });

  it("rejects null input", () => {
    const result = parseDashboardConfig(null);
    expect(result.success).toBe(false);
  });

  it("rejects an array input (wrong type)", () => {
    const result = parseDashboardConfig([validConfig]);
    expect(result.success).toBe(false);
  });

  it("reports field-level messages with actionable text", () => {
    const result = parseDashboardConfig({ defaultCategory: "bad", enabledCategories: [], devices: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      result.errors.forEach((e) => {
        expect(e.field).toBeTruthy();
        expect(e.message).toBeTruthy();
      });
    }
  });
});
