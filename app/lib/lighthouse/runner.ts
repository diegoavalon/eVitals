import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateRunManifests } from "../dashboard";
import type { DashboardConfig, PageRegistry } from "../config";
import { parseLighthouseReport } from "./parseReport";
import type { LighthouseFailure, LighthouseRunResult } from "./types";

export interface LighthouseTask {
  runId: string;
  pageId: string;
  label: string;
  url: string;
  group: string;
  device: string;
  reportJsonPath: string;
  reportHtmlPath: string;
  reportJsonFile: string;
  reportHtmlFile: string;
}

export interface LighthouseCliExecutionResult {
  reportJson: string;
  reportHtml: string;
}

export interface LighthouseTaskResult {
  pageId: string;
  result: LighthouseRunResult;
}

export interface LighthouseRunnerOptions {
  runId: string;
  generatedAt?: string;
  outputRoot: string;
  concurrency: number;
  timeoutMs: number;
  retryCount: number;
  cliPath?: string;
  executeTask?: (input: {
    attempt: number;
    enabledCategories: string[];
    signal: AbortSignal;
    task: LighthouseTask;
  }) => Promise<LighthouseCliExecutionResult>;
}

export interface LighthouseRunnerResult {
  exitCode: 0 | 1;
  manifestPath: string;
  results: LighthouseTaskResult[];
}

function mapMetricStatusToPageStatus(status: LighthouseRunResult["status"]) {
  if (status === "pass") return "good" as const;
  if (status === "fail") return "failing" as const;
  return status;
}

function toScore100(raw: number | null | undefined): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.round(raw * 100);
}

function normalizeConcurrency(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function normalizeAttempts(retryCount: number): number {
  return Number.isFinite(retryCount) ? Math.max(1, Math.floor(retryCount) + 1) : 1;
}

function formatFailure(error: unknown, attempts: number, timedOut: boolean): LighthouseFailure {
  const message = error instanceof Error ? error.message : String(error);
  return {
    reason: message || (timedOut ? "Lighthouse audit timed out" : "Lighthouse audit failed"),
    timedOut,
    attempts,
  };
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

async function runWithTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const timeoutPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        const error = new Error(`Lighthouse audit timed out after ${timeoutMs}ms`);
        error.name = "TimeoutError";
        reject(error);
      },
      { once: true },
    );
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(normalizeConcurrency(concurrency), items.length) }, () => consume()),
  );

  return results;
}

async function ensureParentDirectory(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export function resolveLocalLighthouseCliPath(cwd = process.cwd()): string {
  const require = createRequire(import.meta.url);

  try {
    const packageJsonPath = require.resolve("lighthouse/package.json", { paths: [cwd] });
    let packageJson: { bin?: string | Record<string, string> };

    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        bin?: string | Record<string, string>;
      };
    } catch (error) {
      throw new Error(
        `Unable to parse Lighthouse package metadata at ${packageJsonPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const binPath =
      typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.lighthouse;

    if (typeof binPath === "string" && binPath.length > 0) {
      return path.resolve(path.dirname(packageJsonPath), binPath);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unable to parse Lighthouse package metadata")) {
      throw error;
    }

    // Fall back to the standard local bin shim path when the package is absent
    // or package metadata cannot be resolved from the current working directory.
  }

  return path.join(cwd, "node_modules", ".bin", process.platform === "win32" ? "lighthouse.cmd" : "lighthouse");
}

export function createLighthouseTasks(input: {
  config: DashboardConfig;
  pages: PageRegistry;
  outputRoot: string;
  runId: string;
}): LighthouseTask[] {
  const reportDirectory = path.join(input.outputRoot, "reports", "runs", input.runId);

  return input.pages.flatMap((page) =>
    input.config.devices.map((device) => {
      const basename = `${page.id}.${device}.report`;
      return {
        runId: input.runId,
        pageId: page.id,
        label: page.label,
        url: page.url,
        group: page.group,
        device,
        reportJsonPath: `reports/runs/${input.runId}/${basename}.json`,
        reportHtmlPath: `reports/runs/${input.runId}/${basename}.html`,
        reportJsonFile: path.join(reportDirectory, `${basename}.json`),
        reportHtmlFile: path.join(reportDirectory, `${basename}.html`),
      };
    }),
  );
}

async function executeLighthouseCli(input: {
  attempt: number;
  cliPath: string;
  enabledCategories: string[];
  signal: AbortSignal;
  task: LighthouseTask;
}): Promise<LighthouseCliExecutionResult> {
  const tempBasePath = path.join(
    tmpdir(),
    `lighthouse-${input.task.pageId}-${input.task.device}-${input.attempt}-${randomUUID()}`,
  );

  let deviceArgs: string[];
  if (input.task.device === "desktop") {
    deviceArgs = ["--preset=desktop"];
  } else if (input.task.device === "mobile") {
    deviceArgs = ["--emulated-form-factor=mobile"];
  } else {
    throw new Error(`Unsupported Lighthouse device "${input.task.device}"`);
  }

  const args = [
    input.task.url,
    "--quiet",
    "--chrome-flags=--headless=new",
    `--only-categories=${input.enabledCategories.join(",")}`,
    "--output=json",
    "--output=html",
    `--output-path=${tempBasePath}`,
    ...deviceArgs,
  ];

  const stderrChunks: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(input.cliPath, args, {
        stdio: ["ignore", "ignore", "pipe"],
        signal: input.signal,
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderrChunks.push(chunk.toString());
      });
      child.on("error", reject);
      child.on("close", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            stderrChunks.join("").trim() ||
              `Lighthouse exited with code ${code ?? "unknown"}${signal ? ` (signal ${signal})` : ""}`,
          ),
        );
      });
    });

    const [reportJson, reportHtml] = await Promise.all([
      readFile(`${tempBasePath}.report.json`, "utf8"),
      readFile(`${tempBasePath}.report.html`, "utf8"),
    ]);

    return { reportJson, reportHtml };
  } finally {
    await Promise.allSettled([
      rm(`${tempBasePath}.report.json`, { force: true }),
      rm(`${tempBasePath}.report.html`, { force: true }),
    ]);
  }
}

async function runSingleTask(input: {
  config: DashboardConfig;
  executeTask: NonNullable<LighthouseRunnerOptions["executeTask"]>;
  maxAttempts: number;
  task: LighthouseTask;
  timeoutMs: number;
}): Promise<LighthouseTaskResult> {
  let lastFailure: LighthouseFailure | undefined;

  for (let attempt = 1; attempt <= input.maxAttempts; attempt += 1) {
    try {
      const execution = await runWithTimeout(input.timeoutMs, (signal) =>
        input.executeTask({
          attempt,
          enabledCategories: input.config.enabledCategories,
          signal,
          task: input.task,
        }),
      );

      const rawReport = JSON.parse(execution.reportJson) as unknown;
      const result = parseLighthouseReport(rawReport, {
        runId: input.task.runId,
        enabledCategories: input.config.enabledCategories,
        reportJsonPath: input.task.reportJsonPath,
        reportHtmlPath: input.task.reportHtmlPath,
      });

      await Promise.all([
        ensureParentDirectory(input.task.reportJsonFile),
        ensureParentDirectory(input.task.reportHtmlFile),
      ]);
      await Promise.all([
        writeFile(input.task.reportJsonFile, execution.reportJson, "utf8"),
        writeFile(input.task.reportHtmlFile, execution.reportHtml, "utf8"),
      ]);

      return {
        pageId: input.task.pageId,
        result: {
          ...result,
          requestedUrl: result.requestedUrl || input.task.url,
          finalUrl: result.finalUrl || input.task.url,
          device: input.task.device,
        },
      };
    } catch (error) {
      lastFailure = formatFailure(error, attempt, isTimeoutError(error));
    }
  }

  const failedResult = parseLighthouseReport(null, {
    runId: input.task.runId,
    enabledCategories: input.config.enabledCategories,
    reportJsonPath: input.task.reportJsonPath,
    reportHtmlPath: input.task.reportHtmlPath,
  });

  return {
    pageId: input.task.pageId,
    result: {
      ...failedResult,
      fetchTime: new Date().toISOString(),
      requestedUrl: input.task.url,
      finalUrl: input.task.url,
      device: input.task.device,
      failure: lastFailure ?? formatFailure("Lighthouse audit failed", input.maxAttempts, false),
    },
  };
}

export async function runLighthouseAuditRun(input: {
  config: DashboardConfig;
  pages: PageRegistry;
  options: LighthouseRunnerOptions;
}): Promise<LighthouseRunnerResult> {
  const executeTask =
    input.options.executeTask ??
    ((executorInput) =>
      executeLighthouseCli({
        ...executorInput,
        cliPath: input.options.cliPath ?? resolveLocalLighthouseCliPath(),
      }));

  const tasks = createLighthouseTasks({
    config: input.config,
    pages: input.pages,
    outputRoot: input.options.outputRoot,
    runId: input.options.runId,
  });
  const taskLookup = new Map(tasks.map((task) => [`${task.pageId}::${task.device}`, task]));

  const results = await runWithConcurrency(tasks, input.options.concurrency, (task) =>
    runSingleTask({
      config: input.config,
      executeTask,
      maxAttempts: normalizeAttempts(input.options.retryCount),
      task,
      timeoutMs: input.options.timeoutMs,
    }),
  );

  const manifest = generateRunManifests({
    config: input.config,
    pages: input.pages,
    generatedAt: input.options.generatedAt ?? new Date().toISOString(),
    parsedResults: results,
  })[0] ?? {
    runId: input.options.runId,
    generatedAt: input.options.generatedAt ?? new Date().toISOString(),
    fetchTime: "",
    statusCounts: { good: 0, "needs-improvement": 0, failing: 0, "run-failed": 0 },
    results: [],
  };

  const manifestWithFailureDetails = {
    ...manifest,
    results: results
      .map((item) => {
        const task = taskLookup.get(`${item.pageId}::${item.result.device}`);
        const scoreEntries = Object.fromEntries(
          input.config.enabledCategories.map((category) => [category, toScore100(item.result.categoryScores[category])]),
        );

        return {
          runId: item.result.runId,
          pageId: item.pageId,
          label: task?.label ?? item.pageId,
          url: task?.url ?? item.result.requestedUrl,
          group: task?.group ?? "unknown",
          device: item.result.device,
          status: mapMetricStatusToPageStatus(item.result.status),
          fetchTime: item.result.fetchTime,
          reportJsonPath: item.result.reportJsonPath,
          reportHtmlPath: item.result.reportHtmlPath,
          scores: scoreEntries,
          metrics: item.result.metrics,
          performanceScore: toScore100(item.result.performanceScore),
          failure: item.result.failure,
        };
      })
      .sort((a, b) => (a.pageId === b.pageId ? a.device.localeCompare(b.device) : a.pageId.localeCompare(b.pageId))),
  };

  const manifestPath = path.join(input.options.outputRoot, "data", "runs", input.options.runId, "manifest.json");
  await ensureParentDirectory(manifestPath);
  await writeFile(manifestPath, JSON.stringify(manifestWithFailureDetails, null, 2), "utf8");

  return {
    exitCode: results.some((item) => item.result.failure) ? 1 : 0,
    manifestPath,
    results,
  };
}
