/**
 * Pure helpers for shaping telemetry history for the dashboard chart.
 *
 * The API returns hourly rollups where `temp_avg` may be null (a gap in
 * sensor data). The chart needs contiguous numeric points, so gaps are
 * dropped rather than plotted as zero.
 *
 * Pure and host-independent so it can be unit-tested without a browser.
 */

/** One hourly rollup row as returned by `GET /telemetry/:id/history`. */
export interface TelemetrySample {
  hour: string;
  temp_avg?: number | null;
}

export interface ChartPoint {
  index: number;
  temp: number;
  hour: string;
}

/** Extract numeric temperature points, dropping null/invalid rows. */
export function toChartPoints(history: readonly TelemetrySample[]): ChartPoint[] {
  const points: ChartPoint[] = [];
  history.forEach((h, index) => {
    if (h.temp_avg === null || h.temp_avg === undefined) return;
    const temp = Number(h.temp_avg);
    if (!Number.isFinite(temp)) return;
    points.push({ index, temp, hour: h.hour });
  });
  return points;
}
