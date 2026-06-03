import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readdirSync } from "node:fs";
import { parseDashboardConfig, parsePageRegistry } from "~/lib/config";
import {
  generateDashboardArtifacts,
  generateDashboardData,
  generateRunManifests,
} from "~/lib/dashboard";
import type { GeneratorInputResult, RunManifest } from "~/lib/dashboard";
import { parseLighthouseReport } from "~/lib/lighthouse";

async function main(cwd = process.cwd()): Promise<number> {
  try {
    const [rawPages, rawConfig] = await Promise.all([
      readFile(path.join(cwd, "urls.config.json"), "utf8"),
      readFile(path.join(cwd, "dashboard.config.json"), "utf8"),
    ]);

    const pagesResult = parsePageRegistry(JSON.parse(rawPages));
    if (!pagesResult.success) {
      throw new Error(
        `Invalid urls.config.json: ${pagesResult.errors.map((error) => error.message).join("; ")}`
      );
    }

    const configResult = parseDashboardConfig(JSON.parse(rawConfig));
    if (!configResult.success) {
      throw new Error(
        `Invalid dashboard.config.json: ${configResult.errors.map((error) => error.message).join("; ")}`
      );
    }

    const config = configResult.data;
    const pages = pagesResult.data;
    const outputRoot = path.join(cwd, "public");
    const runsDir = path.join(outputRoot, "data", "runs");

    // Discover all run manifests
    const manifests: RunManifest[] = [];
    let latestRunId: string | null = null;
    let latestRunTimestamp = -Infinity;

    try {
      const runIds = readdirSync(runsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      for (const runId of runIds) {
        const manifestPath = path.join(runsDir, runId, "manifest.json");
        try {
          const manifestJson = await readFile(manifestPath, "utf8");
          const manifest = JSON.parse(manifestJson) as RunManifest;
          manifests.push(manifest);

          // Track the latest run (by ISO timestamp sorting - ISO dates are lexicographically sortable)
          if (latestRunId === null || runId > latestRunId) {
            latestRunId = runId;
            latestRunTimestamp = new Date(runId.replace(/-/g, ":")).getTime();
          }
        } catch (error) {
          console.warn(`⚠️  Failed to read manifest at ${manifestPath}:`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Runs directory not found; assuming first run`);
    }

    // Parse Lighthouse reports from latest run to feed generator
    const parsedResults: GeneratorInputResult[] = [];
    if (latestRunId) {
      for (const manifest of manifests) {
        for (const entry of manifest.results) {
          if (entry.status === "run-failed") {
            // Skip failed runs; only process successful reports
            continue;
          }

          const reportJsonPath = path.join(outputRoot, entry.reportJsonPath);
          try {
            const reportJson = await readFile(reportJsonPath, "utf8");
            const parsed = parseLighthouseReport(JSON.parse(reportJson), {
              runId: manifest.runId,
              enabledCategories: config.enabledCategories,
              reportJsonPath: entry.reportJsonPath,
              reportHtmlPath: entry.reportHtmlPath,
            });
            if (parsed) {
              parsedResults.push({
                pageId: entry.pageId,
                result: parsed,
              });
            }
          } catch (error) {
            console.warn(`⚠️  Failed to parse report at ${reportJsonPath}:`, error);
          }
        }
      }
    }

    // Generate dashboard artifacts
    const generatorInput = {
      config,
      pages,
      parsedResults,
      generatedAt: new Date().toISOString(),
    };

    const { dashboardData } = generateDashboardArtifacts(generatorInput);

    // Write dashboard data
    const dashboardDataPath = path.join(outputRoot, "data", "dashboardData.json");
    await mkdir(path.dirname(dashboardDataPath), { recursive: true });
    await writeFile(dashboardDataPath, JSON.stringify(dashboardData, null, 2), "utf8");

    console.log(`✓ Dashboard artifacts generated to ${dashboardDataPath}`);
    return 0;
  } catch (error) {
    console.error(
      "❌ Generator failed:",
      error instanceof Error ? error.message : String(error)
    );
    return 1;
  }
}

const entryPoint = process.argv[1];

if (entryPoint && path.resolve(entryPoint) === path.resolve(fileURLToPath(import.meta.url))) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

export { main };
