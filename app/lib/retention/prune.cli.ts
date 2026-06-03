import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseDashboardConfig, parsePageRegistry } from "~/lib/config";
import { prune } from "~/lib/retention/prune";
import type { DashboardData } from "~/lib/dashboard.types";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && i + 1 < args.length) {
      const parsed = Number.parseInt(args[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
  }

  return { limit };
}

async function main(cwd = process.cwd()): Promise<number> {
  try {
    const { limit } = parseArgs();
    const outputRoot = path.join(cwd, "public");
    const dashboardDataPath = path.join(outputRoot, "data", "dashboardData.json");

    // Read current dashboard data
    let dashboardData: DashboardData;
    try {
      const json = await readFile(dashboardDataPath, "utf8");
      dashboardData = JSON.parse(json);
    } catch (error) {
      console.warn(`⚠️  Dashboard data not found at ${dashboardDataPath}; skipping prune`);
      return 0;
    }

    // Run pruning
    const pruneResult = prune(dashboardData, outputRoot, limit);

    // Write updated dashboard data
    await writeFile(
      dashboardDataPath,
      JSON.stringify(pruneResult.prunedData, null, 2),
      "utf8"
    );

    console.log(
      `✓ Pruned ${pruneResult.removedRunIds.length} old runs; retained ${pruneResult.retainedCount}`
    );
    if (pruneResult.deletedArtifacts.length > 0) {
      console.log(`  Deleted ${pruneResult.deletedArtifacts.length} artifacts`);
    }

    return 0;
  } catch (error) {
    console.error(
      "❌ Prune failed:",
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
