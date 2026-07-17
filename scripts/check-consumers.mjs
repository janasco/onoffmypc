import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkConsumers, parseWorkspaceRoot } from "./consumer-distribution.mjs";

const designRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const workspaceRoot = parseWorkspaceRoot(process.argv.slice(2), resolve(designRoot, ".."));
  const result = await checkConsumers({ designRoot, workspaceRoot });

  if (result.stale.length > 0) {
    console.error(`Generated design consumers are not current (${result.designVersion}):`);
    for (const consumer of result.stale) {
      console.error(`- ${consumer.path} (${consumer.reason})`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Verified ${result.total} generated design consumers (${result.designVersion}).`);
  }
} catch (error) {
  console.error(`Consumer check failed: ${error.message}`);
  process.exitCode = 1;
}
