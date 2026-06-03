import { describe, expect, it } from "vitest";
import { withBasePath } from "~/lib/url";

describe("withBasePath", () => {
  it("joins project base and relative paths", () => {
    expect(withBasePath("data/dashboardData.json", "/eVitals/")).toBe("/eVitals/data/dashboardData.json");
    expect(withBasePath("/reports/runs/123/report.html", "/eVitals")).toBe("/eVitals/reports/runs/123/report.html");
  });

  it("supports root and relative bases", () => {
    expect(withBasePath("data/dashboardData.json", "/")).toBe("/data/dashboardData.json");
    expect(withBasePath("data/dashboardData.json", "./")).toBe("./data/dashboardData.json");
  });

  it("preserves absolute URLs", () => {
    expect(withBasePath("https://example.com/report.html", "/eVitals/")).toBe("https://example.com/report.html");
  });
});
