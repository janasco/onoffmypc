import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  checkConsumers,
  syncConsumers,
  validateRepositoryPath,
} from "../scripts/consumer-distribution.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "onoff-design-consumers-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const designRoot = join(root, "onoffmypc-design");
  const workspaceRoot = join(root, "workspace");
  const artifactPath = "dist/web/tokens.css";
  const consumerPath = "onoffmypc-web/css/tokens.css";
  const artifact = Buffer.from(":root { --color: #2563eb; }\n");

  await mkdir(join(designRoot, "dist/web"), { recursive: true });
  await mkdir(dirname(join(workspaceRoot, consumerPath)), { recursive: true });
  await Promise.all([
    writeFile(join(designRoot, "package.json"), `${JSON.stringify({ version: "1.2.3" })}\n`),
    writeFile(join(designRoot, artifactPath), artifact),
    writeFile(join(designRoot, "consumers.json"), `${JSON.stringify({
      $schema: "./schema/consumers.schema.json",
      designVersion: "1.2.3",
      artifacts: { [artifactPath]: [consumerPath] },
    }, null, 2)}\n`),
    writeFile(join(designRoot, "dist/manifest.json"), `${JSON.stringify({
      $schema: "../schema/generated-manifest.schema.json",
      designVersion: "1.2.3",
      generatedAt: "deterministic",
      sources: {},
      artifacts: { "web/tokens.css": digest(artifact) },
    }, null, 2)}\n`),
    writeFile(join(workspaceRoot, consumerPath), artifact),
  ]);

  return { artifact, artifactPath, consumerPath, designRoot, root, workspaceRoot };
}

test("check verifies a current temporary workspace", async (t) => {
  const context = await fixture(t);
  const result = await checkConsumers(context);
  assert.deepEqual(result, {
    designVersion: "1.2.3",
    total: 1,
    current: 1,
    stale: [],
  });
});

test("check detects stale content and sync updates it byte-for-byte", async (t) => {
  const context = await fixture(t);
  const destination = join(context.workspaceRoot, context.consumerPath);
  await writeFile(destination, "stale\n");

  const before = await checkConsumers(context);
  assert.deepEqual(before.stale, [{ path: context.consumerPath, reason: "stale" }]);

  const synchronized = await syncConsumers(context);
  assert.equal(synchronized.updated, 1);
  assert.equal(synchronized.unchanged, 0);
  assert.deepEqual(await readFile(destination), context.artifact);
  assert.deepEqual((await checkConsumers(context)).stale, []);
});

test("sync refuses missing destinations without changing existing consumers", async (t) => {
  const context = await fixture(t);
  const firstDestination = join(context.workspaceRoot, context.consumerPath);
  const missingPath = "onoffmypc-app/src/generated/tokens.ts";
  await writeFile(firstDestination, "leave stale\n");

  const consumersPath = join(context.designRoot, "consumers.json");
  const consumers = JSON.parse(await readFile(consumersPath, "utf8"));
  consumers.artifacts[context.artifactPath].push(missingPath);
  await writeFile(consumersPath, `${JSON.stringify(consumers, null, 2)}\n`);

  await assert.rejects(syncConsumers(context), /refusing to create undeclared consumer files/);
  assert.equal(await readFile(firstDestination, "utf8"), "leave stale\n");
});

test("version and generated artifact hashes are validated before distribution", async (t) => {
  const context = await fixture(t);
  const consumersPath = join(context.designRoot, "consumers.json");
  const consumers = JSON.parse(await readFile(consumersPath, "utf8"));
  consumers.designVersion = "1.2.4";
  await writeFile(consumersPath, JSON.stringify(consumers));
  await assert.rejects(checkConsumers(context), /does not match package version/);

  consumers.designVersion = "1.2.3";
  await writeFile(consumersPath, JSON.stringify(consumers));
  await writeFile(join(context.designRoot, context.artifactPath), "tampered\n");
  await assert.rejects(checkConsumers(context), /does not match dist\/manifest.json/);
});

test("unsafe repository paths are rejected", () => {
  for (const path of ["../escape", "/absolute/file", "repo/../escape", "repo/.git/config", "repo\\file"]) {
    assert.throws(() => validateRepositoryPath(path, "test path"));
  }
  assert.deepEqual(validateRepositoryPath("repo/generated/file.css", "test path"), [
    "repo",
    "generated",
    "file.css",
  ]);
});

test("consumer symlinks are rejected without touching their target", async (t) => {
  const context = await fixture(t);
  const destination = join(context.workspaceRoot, context.consumerPath);
  const outside = join(context.root, "outside.css");
  await writeFile(outside, "outside\n");
  await unlink(destination);
  await symlink(outside, destination);

  await assert.rejects(checkConsumers(context), /symbolic link/);
  assert.equal(await readFile(outside, "utf8"), "outside\n");
});
