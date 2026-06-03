import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseDashboardConfig, parsePageRegistry } from "./lib/config";
import { runLighthouseAuditRun } from "./lib/lighthouse";

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createRunId(now = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

export async function main(cwd = process.cwd()): Promise<number> {
  const [rawPages, rawConfig] = await Promise.all([
    readFile(path.join(cwd, "urls.config.json"), "utf8"),
    readFile(path.join(cwd, "dashboard.config.json"), "utf8"),
  ]);

  const pagesResult = parsePageRegistry(JSON.parse(rawPages));
  if (!pagesResult.success) {
    throw new Error(`Invalid urls.config.json: ${pagesResult.errors.map((error) => error.message).join("; ")}`);
  }

  const configResult = parseDashboardConfig(JSON.parse(rawConfig));
  if (!configResult.success) {
    throw new Error(`Invalid dashboard.config.json: ${configResult.errors.map((error) => error.message).join("; ")}`);
  }

  const result = await runLighthouseAuditRun({
    config: configResult.data,
    pages: pagesResult.data,
    options: {
      runId: process.env.LIGHTHOUSE_RUN_ID ?? createRunId(),
      outputRoot: process.env.LIGHTHOUSE_OUTPUT_ROOT ?? path.join(cwd, "public"),
      concurrency: parseInteger(process.env.LIGHTHOUSE_CONCURRENCY, 2),
      timeoutMs: parseInteger(process.env.LIGHTHOUSE_TIMEOUT_MS, 300_000),
      retryCount: parseInteger(process.env.LIGHTHOUSE_RETRY_COUNT, 1),
      cliPath: process.env.LIGHTHOUSE_CLI_PATH,
    },
  });

  return result.exitCode;
}

if (process.argv[1]?.length && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
