import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

test("Power On is a blue request while observed PC on remains positive", async () => {
  const [tokens, states, consumers] = await Promise.all([
    readFile(resolve(root, "tokens/foundation.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "states/presentation.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "consumers.json"), "utf8").then(JSON.parse),
  ]);

  for (const theme of ["light", "dark"]) {
    assert.equal(
      tokens.color.semantic[theme].power.on.background.$value,
      `{color.semantic.${theme}.action.primary.background}`,
    );
    assert.equal(
      tokens.color.semantic[theme].power.on.foreground.$value,
      `{color.semantic.${theme}.action.primary.foreground}`,
    );
  }

  assert.equal(states.commandAction.power_on.tone, "info");
  assert.equal(states.pc.on.tone, "positive");
  assert.equal(states.command.confirmed.tone, "positive");
  assert.deepEqual(consumers.artifacts["dist/assets/onoffmypc-mark.svg"], [
    "onoffmypc-web/favicon.svg",
    "onoffmypc-web/app/favicon.svg",
  ]);
});
