import { describe, it, expect } from "vitest";
import { parsePageRegistry } from "~/lib/config";

const validEntry = {
  id: "homepage",
  label: "Homepage",
  url: "https://www.ehealthinsurance.com/",
  group: "core",
};

const secondEntry = {
  id: "medicare",
  label: "Medicare",
  url: "https://www.ehealthinsurance.com/medicare/",
  group: "medicare",
};

describe("parsePageRegistry — valid inputs", () => {
  it("accepts a valid single-entry registry", () => {
    const result = parsePageRegistry([validEntry]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("homepage");
    }
  });

  it("accepts a multi-entry registry with unique ids", () => {
    const result = parsePageRegistry([validEntry, secondEntry]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("strips unknown extra fields from entries", () => {
    const withExtra = { ...validEntry, extraField: "should-be-stripped" };
    const result = parsePageRegistry([withExtra]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).not.toHaveProperty("extraField");
    }
  });

  it("preserves all required fields in output", () => {
    const result = parsePageRegistry([validEntry]);
    expect(result.success).toBe(true);
    if (result.success) {
      const entry = result.data[0];
      expect(entry.id).toBe(validEntry.id);
      expect(entry.label).toBe(validEntry.label);
      expect(entry.url).toBe(validEntry.url);
      expect(entry.group).toBe(validEntry.group);
    }
  });
});

describe("parsePageRegistry — invalid inputs", () => {
  it("rejects a non-array input", () => {
    const result = parsePageRegistry({ id: "not-an-array" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects an entry with missing id", () => {
    const result = parsePageRegistry([{ label: "No ID", url: "https://example.com", group: "core" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("id"))).toBe(true);
    }
  });

  it("rejects an entry with empty id", () => {
    const result = parsePageRegistry([{ ...validEntry, id: "" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const idError = result.errors.find((e) => e.field.includes("id"));
      expect(idError).toBeDefined();
      expect(idError!.message).toMatch(/required/i);
    }
  });

  it("rejects an entry with missing label", () => {
    const result = parsePageRegistry([{ id: "p1", url: "https://example.com", group: "core" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("label"))).toBe(true);
    }
  });

  it("rejects an entry with missing url", () => {
    const result = parsePageRegistry([{ id: "p1", label: "Page", group: "core" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("url"))).toBe(true);
    }
  });

  it("rejects an entry with an invalid URL", () => {
    const result = parsePageRegistry([{ ...validEntry, url: "not-a-valid-url" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const urlError = result.errors.find((e) => e.field.includes("url"));
      expect(urlError).toBeDefined();
      expect(urlError!.message).toMatch(/url/i);
    }
  });

  it("rejects an entry with missing group", () => {
    const result = parsePageRegistry([{ id: "p1", label: "Page", url: "https://example.com" }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.errors.map((e) => e.field);
      expect(fields.some((f) => f.includes("group"))).toBe(true);
    }
  });

  it("rejects duplicate page ids", () => {
    const dup = { ...validEntry }; // same id as validEntry
    const result = parsePageRegistry([validEntry, dup]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dupError = result.errors.find((e) => e.message.includes("Duplicate"));
      expect(dupError).toBeDefined();
      expect(dupError!.message).toContain("homepage");
    }
  });

  it("reports field-level messages for multiple errors", () => {
    const result = parsePageRegistry([
      { id: "", label: "", url: "bad-url", group: "" },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("rejects null input", () => {
    const result = parsePageRegistry(null);
    expect(result.success).toBe(false);
  });

  it("rejects undefined input", () => {
    const result = parsePageRegistry(undefined);
    expect(result.success).toBe(false);
  });
});
