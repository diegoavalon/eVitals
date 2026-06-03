import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fixtureReport from "../../../fixtures/www.ehealthinsurance.com_2026-06-02_11-19-41.report.json";
import { parseDashboardConfig, parsePageRegistry } from "~/lib/config";
import { createLighthouseTasks, runLighthouseAuditRun } from "~/lib/lighthouse";

const parsedConfig = parseDashboardConfig({
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile", "desktop"],
  historyLimit: 30,
  basePath: "/eVitals/",
});

const parsedSingleDeviceConfig = parseDashboardConfig({
  defaultCategory: "performance",
  enabledCategories: ["performance", "accessibility", "best-practices", "seo"],
  devices: ["mobile"],
  historyLimit: 30,
  basePath: "/eVitals/",
});

const parsedPages = parsePageRegistry([
  {
    id: "homepage",
    label: "Homepage",
    url: "https://www.ehealthinsurance.com/",
    group: "core",
  },
  {
    id: "plans",
    label: "Plans",
    url: "https://www.ehealthinsurance.com/plans",
    group: "core",
  },
]);

if (!parsedConfig.success || !parsedSingleDeviceConfig.success || !parsedPages.success) {
  throw new Error("Runner test fixtures are invalid");
}

const config = parsedConfig.data;
const singleDeviceConfig = parsedSingleDeviceConfig.data;
const pages = parsedPages.data;
const fixtureHtmlPath = path.join(
  process.cwd(),
  "fixtures",
  "www.ehealthinsurance.com_2026-06-02_11-19-41.report.html",
);

const tempPaths: string[] = [];

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createOutputRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "evitals-runner-test-"));
  tempPaths.push(root);
  return path.join(root, "public");
}

async function successfulExecution(url: string, device: string) {
  const reportHtml = await readFile(fixtureHtmlPath, "utf8");
  return {
    reportJson: JSON.stringify({
      ...fixtureReport,
      requestedUrl: url,
      finalUrl: url,
      configSettings: {
        ...fixtureReport.configSettings,
        formFactor: device,
      },
    }),
    reportHtml,
  };
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })));
});

describe("lighthouse runner", () => {
  it("generates exactly one task per configured page/device pair", async () => {
    const outputRoot = await createOutputRoot();

    const tasks = createLighthouseTasks({
      config,
      pages,
      outputRoot,
      runId: "2026-06-03T14-00-00Z",
    });

    expect(tasks).toHaveLength(4);
    expect(tasks.map((task) => `${task.pageId}:${task.device}`)).toEqual([
      "homepage:mobile",
      "homepage:desktop",
      "plans:mobile",
      "plans:desktop",
    ]);
    expect(tasks[0].reportJsonPath).toBe("reports/runs/2026-06-03T14-00-00Z/homepage.mobile.report.json");
    expect(tasks[1].reportHtmlPath).toBe("reports/runs/2026-06-03T14-00-00Z/homepage.desktop.report.html");
  });

  it("bounds task execution by the configured concurrency", async () => {
    const outputRoot = await createOutputRoot();
    let active = 0;
    let maxActive = 0;

    const result = await runLighthouseAuditRun({
      config,
      pages,
      options: {
        runId: "2026-06-03T14-00-00Z",
        outputRoot,
        concurrency: 2,
        timeoutMs: 1_000,
        retryCount: 0,
        executeTask: async ({ task }) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await delay(25);
          active -= 1;
          return successfulExecution(task.url, task.device);
        },
      },
    });

    expect(result.exitCode).toBe(0);
    expect(maxActive).toBe(2);
  });

  it("retries timed out tasks up to the configured retry count", async () => {
    const outputRoot = await createOutputRoot();
    const attempts: number[] = [];

    const result = await runLighthouseAuditRun({
      config: singleDeviceConfig,
      pages: pages.slice(0, 1),
      options: {
        runId: "2026-06-03T14-00-00Z",
        outputRoot,
        concurrency: 1,
        timeoutMs: 10,
        retryCount: 1,
        executeTask: async ({ attempt, signal, task }) => {
          attempts.push(attempt);

          if (attempt === 1) {
            await new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 100);
              signal.addEventListener(
                "abort",
                () => {
                  clearTimeout(timer);
                },
                { once: true },
              );
            });
          }

          return successfulExecution(task.url, task.device);
        },
      },
    });

    expect(result.exitCode).toBe(0);
    expect(attempts).toEqual([1, 2]);
    expect(result.results[0].result.failure).toBeUndefined();
  });

  it("persists successful artifacts, records failures in the manifest, and continues remaining tasks", async () => {
    const outputRoot = await createOutputRoot();

    const result = await runLighthouseAuditRun({
      config: singleDeviceConfig,
      pages,
      options: {
        runId: "2026-06-03T14-00-00Z",
        outputRoot,
        concurrency: 2,
        timeoutMs: 1_000,
        retryCount: 1,
        executeTask: async ({ attempt, task }) => {
          if (task.pageId === "plans") {
            throw new Error(`simulated failure on attempt ${attempt}`);
          }

          return successfulExecution(task.url, task.device);
        },
      },
    });

    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
      results: Array<{
        pageId: string;
        status: string;
        failure?: { reason: string; attempts: number; timedOut: boolean };
      }>;
    };
    const successJsonPath = path.join(
      outputRoot,
      "reports",
      "runs",
      "2026-06-03T14-00-00Z",
      "homepage.mobile.report.json",
    );
    const successHtmlPath = path.join(
      outputRoot,
      "reports",
      "runs",
      "2026-06-03T14-00-00Z",
      "homepage.mobile.report.html",
    );

    expect(result.exitCode).toBe(1);
    expect(manifest.results).toHaveLength(2);
    expect(manifest.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pageId: "homepage",
          status: "failing",
        }),
        expect.objectContaining({
          pageId: "plans",
          status: "run-failed",
          failure: expect.objectContaining({
            reason: expect.stringContaining("simulated failure on attempt 2"),
            attempts: 2,
            timedOut: false,
          }),
        }),
      ]),
    );
    expect(await readFile(successJsonPath, "utf8")).toContain('"requestedUrl":"https://www.ehealthinsurance.com/"');
    expect(await readFile(successHtmlPath, "utf8")).toContain("<!doctype html>");
  });
});
