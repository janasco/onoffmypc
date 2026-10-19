import { test } from "node:test";
import assert from "node:assert/strict";
import { toChartPoints } from "../src/lib/telemetry.ts";

test("keeps valid numeric temperature rows", () => {
  const points = toChartPoints([
    { hour: "2026-10-13T00:00:00Z", temp_avg: 41.5 },
    { hour: "2026-10-13T01:00:00Z", temp_avg: 42.25 },
  ]);
  assert.equal(points.length, 2);
  assert.equal(points[0].temp, 41.5);
  assert.equal(points[0].hour, "2026-10-13T00:00:00Z");
});

test("preserves the original index so gaps stay visible in the x scale", () => {
  const points = toChartPoints([
    { hour: "a", temp_avg: 10 },
    { hour: "b", temp_avg: null },
    { hour: "c", temp_avg: 20 },
  ]);
  // The middle row is dropped, so the surviving point keeps index 2 rather
  // than being re-numbered to 1.
  assert.deepEqual(points.map((p) => p.index), [0, 2]);
});

test("drops null, missing, and non-finite temperatures instead of plotting zero", () => {
  const points = toChartPoints([
    { hour: "a", temp_avg: null },
    { hour: "b" },
    { hour: "c", temp_avg: Number.NaN },
    { hour: "d", temp_avg: 33 },
  ]);
  assert.deepEqual(points.map((p) => p.hour), ["d"]);
});

test("returns no points for an empty history", () => {
  assert.deepEqual(toChartPoints([]), []);
});

test("coerces numeric strings the API may emit for D1 REAL columns", () => {
  const points = toChartPoints([{ hour: "a", temp_avg: "44.5" as unknown as number }]);
  assert.equal(points[0].temp, 44.5);
});
