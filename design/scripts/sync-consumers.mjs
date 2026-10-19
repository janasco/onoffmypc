import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseWorkspaceRoot, syncConsumers } from "./consumer-distribution.mjs";

const designRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

try {
  const workspaceRoot = parseWorkspaceRoot(process.argv.slice(2), resolve(designRoot, ".."));
  const result = await syncConsumers({ designRoot, workspaceRoot });
  console.log(
    `Synchronized ${result.updated} of ${result.total} generated design consumers `
      + `(${result.designVersion}); ${result.unchanged} already current.`,
  );
} catch (error) {
  console.error(`Consumer sync failed: ${error.message}`);
  process.exitCode = 1;
}
