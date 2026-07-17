import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from "node:path";

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[0-9a-f]{64}$/;

const fail = (message) => {
  throw new Error(message);
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function assertRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} contains unsupported property: ${key}`);
  }
}

async function readJson(path, label) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    fail(`cannot read ${label}: ${error.message}`);
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

export function validateRepositoryPath(value, label, { requiredPrefix } = {}) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (value.includes("\\") || value.includes("\0") || /[\u0000-\u001f]/.test(value)) {
    fail(`${label} must use a safe POSIX-style path`);
  }
  if (isAbsolute(value) || posix.isAbsolute(value) || win32.isAbsolute(value)) {
    fail(`${label} must be relative`);
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail(`${label} must not contain empty, current-directory, or parent-directory segments`);
  }
  if (segments.includes(".git")) fail(`${label} must not target Git metadata`);
  if (posix.normalize(value) !== value) fail(`${label} must be normalized`);
  if (requiredPrefix && !value.startsWith(`${requiredPrefix}/`)) {
    fail(`${label} must be under ${requiredPrefix}/`);
  }
  return segments;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isWithin(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === ""
    || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot));
}

async function validateManifest({ designRoot, consumers, pkg, generatedManifest }) {
  assertRecord(pkg, "package.json");
  if (typeof pkg.version !== "string" || !semverPattern.test(pkg.version)) {
    fail("package.json version must be semantic version text");
  }

  assertRecord(consumers, "consumers.json");
  assertOnlyKeys(consumers, new Set(["$schema", "designVersion", "artifacts"]), "consumers.json");
  if (consumers.$schema !== undefined && consumers.$schema !== "./schema/consumers.schema.json") {
    fail("consumers.json $schema must reference ./schema/consumers.schema.json");
  }
  if (consumers.designVersion !== pkg.version) {
    fail(`consumers.json designVersion ${String(consumers.designVersion)} does not match package version ${pkg.version}`);
  }
  assertRecord(consumers.artifacts, "consumers.json artifacts");
  if (Object.keys(consumers.artifacts).length === 0) fail("consumers.json artifacts must not be empty");

  assertRecord(generatedManifest, "dist/manifest.json");
  assertOnlyKeys(
    generatedManifest,
    new Set(["$schema", "designVersion", "generatedAt", "sources", "artifacts"]),
    "dist/manifest.json",
  );
  if (generatedManifest.$schema !== "../schema/generated-manifest.schema.json") {
    fail("dist/manifest.json $schema must reference ../schema/generated-manifest.schema.json");
  }
  if (generatedManifest.designVersion !== pkg.version) {
    fail(
      `dist/manifest.json designVersion ${String(generatedManifest.designVersion)} `
        + `does not match package version ${pkg.version}`,
    );
  }
  if (typeof generatedManifest.generatedAt !== "string" || generatedManifest.generatedAt.length === 0) {
    fail("dist/manifest.json generatedAt must be non-empty text");
  }
  for (const [collectionName, collection] of [
    ["sources", generatedManifest.sources],
    ["artifacts", generatedManifest.artifacts],
  ]) {
    assertRecord(collection, `dist/manifest.json ${collectionName}`);
    for (const [path, digest] of Object.entries(collection)) {
      if (collectionName === "artifacts") validateRepositoryPath(path, `generated artifact ${path}`);
      if (typeof digest !== "string" || !sha256Pattern.test(digest)) {
        fail(`dist/manifest.json ${collectionName}.${path} must be a lowercase SHA-256 digest`);
      }
    }
  }

  const entries = [];
  const destinations = new Set();
  const designDirectoryName = basename(designRoot);

  for (const [artifactPath, consumerPaths] of Object.entries(consumers.artifacts)) {
    validateRepositoryPath(artifactPath, `artifact path ${artifactPath}`, { requiredPrefix: "dist" });
    if (!Array.isArray(consumerPaths) || consumerPaths.length === 0) {
      fail(`consumer list for ${artifactPath} must be a non-empty array`);
    }

    const generatedPath = artifactPath.slice("dist/".length);
    const expectedDigest = generatedManifest.artifacts[generatedPath];
    if (typeof expectedDigest !== "string") {
      fail(`${artifactPath} is not declared in dist/manifest.json`);
    }

    const sourcePath = resolve(designRoot, artifactPath);
    if (!isWithin(designRoot, sourcePath)) fail(`artifact escapes the design repository: ${artifactPath}`);
    let sourceStats;
    try {
      sourceStats = await lstat(sourcePath);
    } catch (error) {
      fail(`cannot read canonical artifact ${artifactPath}: ${error.message}`);
    }
    if (sourceStats.isSymbolicLink() || !sourceStats.isFile()) {
      fail(`canonical artifact must be a regular, non-symbolic-link file: ${artifactPath}`);
    }
    const expected = await readFile(sourcePath);
    const actualDigest = sha256(expected);
    if (actualDigest !== expectedDigest) {
      fail(
        `${artifactPath} does not match dist/manifest.json `
          + `(expected ${expectedDigest}, received ${actualDigest})`,
      );
    }

    const localDestinations = new Set();
    for (const consumerPath of consumerPaths) {
      const segments = validateRepositoryPath(consumerPath, `consumer path for ${artifactPath}`);
      if (segments.length < 2) fail(`consumer path must include a repository and file: ${consumerPath}`);
      if (segments[0] === designDirectoryName) {
        fail(`consumer path must not target the design repository: ${consumerPath}`);
      }
      if (localDestinations.has(consumerPath) || destinations.has(consumerPath)) {
        fail(`consumer destination is declared more than once: ${consumerPath}`);
      }
      localDestinations.add(consumerPath);
      destinations.add(consumerPath);
      entries.push({ artifactPath, consumerPath, expected });
    }
  }

  return { designVersion: pkg.version, entries };
}

async function inspectDestination({ designRoot, workspaceRoot, consumerPath }) {
  const destination = resolve(workspaceRoot, consumerPath);
  if (!isWithin(workspaceRoot, destination)) fail(`consumer escapes workspace root: ${consumerPath}`);
  if (isWithin(designRoot, destination)) fail(`consumer targets the design repository: ${consumerPath}`);

  const segments = consumerPath.split("/");
  let current = workspaceRoot;
  for (const segment of segments.slice(0, -1)) {
    current = resolve(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT") return { destination, missing: true, reason: "missing" };
      fail(`cannot inspect ${consumerPath}: ${error.message}`);
    }
    if (stats.isSymbolicLink()) fail(`consumer path contains a symbolic link: ${consumerPath}`);
    if (!stats.isDirectory()) fail(`consumer parent is not a directory: ${consumerPath}`);
  }

  let stats;
  try {
    stats = await lstat(destination);
  } catch (error) {
    if (error.code === "ENOENT") return { destination, missing: true, reason: "missing" };
    fail(`cannot inspect ${consumerPath}: ${error.message}`);
  }
  if (stats.isSymbolicLink()) fail(`consumer destination is a symbolic link: ${consumerPath}`);
  if (!stats.isFile()) fail(`consumer destination is not a regular file: ${consumerPath}`);

  return { destination, missing: false, actual: await readFile(destination) };
}

async function createPlan({ designRoot, workspaceRoot }) {
  const resolvedDesignRoot = await realpath(resolve(designRoot));
  const resolvedWorkspaceRoot = await realpath(resolve(workspaceRoot));
  const [pkg, consumers, generatedManifest] = await Promise.all([
    readJson(resolve(resolvedDesignRoot, "package.json"), "package.json"),
    readJson(resolve(resolvedDesignRoot, "consumers.json"), "consumers.json"),
    readJson(resolve(resolvedDesignRoot, "dist/manifest.json"), "dist/manifest.json"),
  ]);
  const manifest = await validateManifest({
    designRoot: resolvedDesignRoot,
    consumers,
    pkg,
    generatedManifest,
  });

  const entries = [];
  for (const entry of manifest.entries) {
    entries.push({
      ...entry,
      ...await inspectDestination({
        designRoot: resolvedDesignRoot,
        workspaceRoot: resolvedWorkspaceRoot,
        consumerPath: entry.consumerPath,
      }),
    });
  }
  return { designVersion: manifest.designVersion, entries };
}

export async function checkConsumers(options) {
  const plan = await createPlan(options);
  const stale = plan.entries
    .filter((entry) => entry.missing || !entry.expected.equals(entry.actual))
    .map((entry) => ({
      path: entry.consumerPath,
      reason: entry.missing ? "missing" : "stale",
    }));
  return {
    designVersion: plan.designVersion,
    total: plan.entries.length,
    current: plan.entries.length - stale.length,
    stale,
  };
}

export async function syncConsumers(options) {
  const plan = await createPlan(options);
  const missing = plan.entries.filter((entry) => entry.missing);
  if (missing.length > 0) {
    fail(
      `refusing to create undeclared consumer files; seed these destinations first:\n`
        + missing.map((entry) => `- ${entry.consumerPath}`).join("\n"),
    );
  }

  const stale = plan.entries.filter((entry) => !entry.expected.equals(entry.actual));
  const written = [];
  try {
    for (const entry of stale) {
      written.push(entry);
      await writeFile(entry.destination, entry.expected);
      const synchronized = await readFile(entry.destination);
      if (!synchronized.equals(entry.expected)) fail(`write verification failed for ${entry.consumerPath}`);
    }
  } catch (error) {
    const rollbackFailures = [];
    for (const entry of written.reverse()) {
      try {
        await writeFile(entry.destination, entry.actual);
      } catch (rollbackError) {
        rollbackFailures.push(`${entry.consumerPath}: ${rollbackError.message}`);
      }
    }
    const rollback = rollbackFailures.length === 0
      ? "previous writes were rolled back"
      : `rollback failures:\n${rollbackFailures.map((failure) => `- ${failure}`).join("\n")}`;
    fail(`consumer synchronization stopped: ${error.message}; ${rollback}`);
  }

  return {
    designVersion: plan.designVersion,
    total: plan.entries.length,
    updated: stale.length,
    unchanged: plan.entries.length - stale.length,
  };
}

export function parseWorkspaceRoot(args, fallback) {
  if (args.length === 0) return fallback;
  if (args.length === 2 && args[0] === "--workspace-root" && args[1]) return resolve(args[1]);
  if (args.length === 1 && args[0].startsWith("--workspace-root=")) {
    const value = args[0].slice("--workspace-root=".length);
    if (value) return resolve(value);
  }
  fail("usage: [--workspace-root <path>]");
}
