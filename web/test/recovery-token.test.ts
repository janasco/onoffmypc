import { test } from "node:test";
import assert from "node:assert/strict";
import { recoveryTokenFromHash } from "../src/lib/recovery-token.ts";

test("reads the current token fragment format", () => {
  assert.equal(
    recoveryTokenFromHash("#token=v2_1234"),
    "v2_1234",
  );
});

test("reads a bare token fragment and trims whitespace", () => {
  assert.equal(
    recoveryTokenFromHash("#v2_1234"),
    "v2_1234",
  );
  assert.equal(
    recoveryTokenFromHash("#token=  v2_1234  "),
    "v2_1234",
  );
});

test("ignores empty, unrelated, and missing fragments", () => {
  assert.equal(recoveryTokenFromHash(""), null);
  assert.equal(recoveryTokenFromHash("#"), null);
  assert.equal(recoveryTokenFromHash("#other=value"), null);
  assert.equal(recoveryTokenFromHash("#token="), null);
});
