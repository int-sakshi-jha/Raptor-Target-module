import type { TrackerChartSeries, TrackerTimePoint } from "@/lib/plant/plantLiveProcessed";
import { TRACKER_DAY_SLOT_COUNT } from "@/lib/plant/plantLiveProcessed";
import { toNumericArray } from "@/lib/plant/componentLiveData";
import {
  getTrackerChartTheme,
  type TrackerChartTheme,
} from "@/lib/plant/trackerChartTheme";
import type Highcharts from "highcharts";

export interface TrackerChartPoint {
  index: number;
  timestamp: number;
  label: string;
  actual: number | null;
  projected: number | null;
  deviation: number | null;
}

export interface TrackerZoneChartKpis {
  trackingEfficiencyPct: number;
  avgDeviationDeg: number | null;
  peakProjectedDeg: number | null;
  maxDeviationDeg: number | null;
}

export interface TrackerDeviationDot {
  x: number;
  y: number;
  deviation: number;
  trackerName: string;
}

/** Solar tracking window: 6 AM → 8 PM (inclusive end slot at 20:00). */
export const TRACKER_CHART_START_SLOT = 6 * 4;
export const TRACKER_CHART_END_SLOT = 20 * 4;
export const TRACKER_CHART_SLOT_COUNT =
  TRACKER_CHART_END_SLOT - TRACKER_CHART_START_SLOT + 1;

const ON_TARGET_DEVIATION_DEG = 2;
const MIN_DEVIATION_DOT_DEG = 2;

const CHART_COLORS = {
  projected: "#FBBF24",
  avgActual: "#38BDF8",
  trackerLine: "rgba(56, 189, 248, 0.14)",
  grid: "rgba(148, 163, 184, 0.08)",
  tick: "rgba(148, 163, 184, 0.22)",
  label: "#94A3B8",
  deviationLow: "#FCD34D",
  deviationMid: "#FB923C",
  deviationHigh: "#F87171",
};

function coerceSeriesArray(value: unknown): (number | null)[] {
  return toNumericArray(value);
}

export function normalizeChartSeriesList(raw: TrackerChartSeries[]): TrackerChartSeries[] {
  return raw.map((item) => ({
    trackerIndex: item.trackerIndex,
    trackerName: item.trackerName,
    actual: coerceSeriesArray(item.actual),
    projected: coerceSeriesArray(item.projected),
    deviation: coerceSeriesArray(item.deviation),
  }));
}

export function alignTrackerSeries(
  timePoints: TrackerTimePoint[],
  series: TrackerChartSeries,
): TrackerChartPoint[] {
  const actual = coerceSeriesArray(series.actual);
  const projected = coerceSeriesArray(series.projected);
  const deviation = coerceSeriesArray(series.deviation);
  const len = Math.max(
    timePoints.length,
    actual.length,
    projected.length,
    deviation.length,
    TRACKER_DAY_SLOT_COUNT,
  );

  return Array.from({ length: len }, (_, index) => {
    const tp = timePoints[index];
    return {
      index,
      timestamp: tp?.timestamp ?? 0,
      label: tp?.label ?? "",
      actual: actual[index] ?? null,
      projected: projected[index] ?? null,
      deviation: deviation[index] ?? null,
    };
  });
}

function sliceChartWindow<T>(values: T[]): T[] {
  return values.slice(TRACKER_CHART_START_SLOT, TRACKER_CHART_END_SLOT + 1);
}

function sliceChartPoints(points: TrackerChartPoint[]): TrackerChartPoint[] {
  return sliceChartWindow(points).map((point, localIndex) => ({
    ...point,
    index: localIndex,
  }));
}

function resolveDeviation(point: TrackerChartPoint): number | null {
  if (point.deviation != null) return Math.abs(point.deviation);
  if (point.actual != null && point.projected != null) {
    return Math.abs(point.actual - point.projected);
  }
  return null;
}

export function computeZoneChartKpis(
  chartSeries: TrackerChartSeries[],
  timePoints: TrackerTimePoint[],
): TrackerZoneChartKpis {
  let onTarget = 0;
  let deviationSamples = 0;
  let deviationSum = 0;
  let maxDeviation = 0;
  let peakProjected = Number.NEGATIVE_INFINITY;

  for (const series of chartSeries) {
    const points = sliceChartPoints(alignTrackerSeries(timePoints, series));
    for (const point of points) {
      if (point.projected != null && point.projected > peakProjected) {
        peakProjected = point.projected;
      }

      const dev = resolveDeviation(point);
      if (dev == null) continue;

      deviationSamples += 1;
      deviationSum += dev;
      if (dev <= ON_TARGET_DEVIATION_DEG) onTarget += 1;
      if (dev > maxDeviation) maxDeviation = dev;
    }
  }

  return {
    trackingEfficiencyPct:
      deviationSamples > 0 ? Math.round((onTarget / deviationSamples) * 100) : 0,
    avgDeviationDeg:
      deviationSamples > 0
        ? parseFloat((deviationSum / deviationSamples).toFixed(1))
        : null,
    peakProjectedDeg: Number.isFinite(peakProjected) ? peakProjected : null,
    maxDeviationDeg: maxDeviation > 0 ? maxDeviation : null,
  };
}

export function seriesHasPlottableData(points: TrackerChartPoint[]): boolean {
  return points.some(
    (point) => point.actual != null || point.projected != null || point.deviation != null,
  );
}

export function zoneHasPlottableData(
  chartSeries: TrackerChartSeries[],
  timePoints: TrackerTimePoint[],
): boolean {
  return chartSeries.some((series) =>
    seriesHasPlottableData(sliceChartPoints(alignTrackerSeries(timePoints, series))),
  );
}

export function filterChartSeries(
  chartSeries: TrackerChartSeries[],
  query: string,
): TrackerChartSeries[] {
  const q = query.trim().toLowerCase();
  if (!q) return chartSeries;
  return chartSeries.filter(
    (series) =>
      series.trackerName.toLowerCase().includes(q) ||
      String(series.trackerIndex).includes(q),
  );
}

function buildProjectedSunLine(
  chartSeries: TrackerChartSeries[],
  timePoints: TrackerTimePoint[],
): (number | null)[] {
  const merged: (number | null)[] = Array(timePoints.length).fill(null);

  for (const series of chartSeries) {
    const points = alignTrackerSeries(timePoints, series);
    points.forEach((point, index) => {
      if (point.projected == null) return;
      const current = merged[index];
      merged[index] =
        current == null ? point.projected : Math.max(current, point.projected);
    });
  }

  return sliceChartWindow(merged);
}

function buildZoneAverageLine(
  chartSeries: TrackerChartSeries[],
  timePoints: TrackerTimePoint[],
): (number | null)[] {
  const windowLen = TRACKER_CHART_SLOT_COUNT;
  const sums = Array(windowLen).fill(0);
  const counts = Array(windowLen).fill(0);

  for (const series of chartSeries) {
    const points = sliceChartPoints(alignTrackerSeries(timePoints, series));
    points.forEach((point, index) => {
      if (point.actual == null) return;
      sums[index] += point.actual;
      counts[index] += 1;
    });
  }

  return sums.map((sum, index) =>
    counts[index] > 0 ? parseFloat((sum / counts[index]).toFixed(2)) : null,
  );
}

function collectDeviationDots(
  chartSeries: TrackerChartSeries[],
  timePoints: TrackerTimePoint[],
): TrackerDeviationDot[] {
  const dots: TrackerDeviationDot[] = [];

  for (const series of chartSeries) {
    const points = sliceChartPoints(alignTrackerSeries(timePoints, series));
    points.forEach((point) => {
      const dev = resolveDeviation(point);
      if (dev == null || dev < MIN_DEVIATION_DOT_DEG || point.actual == null) return;
      dots.push({
        x: point.index,
        y: point.actual,
        deviation: dev,
        trackerName: series.trackerName,
      });
    });
  }

  return dots;
}

function deviationMarkerRadius(deviation: number): number {
  if (deviation >= 10) return 3.5;
  if (deviation >= 5) return 2.8;
  return 2.2;
}

function deviationMarkerColor(deviation: number): string {
  if (deviation >= 10) return CHART_COLORS.deviationHigh;
  if (deviation >= 5) return CHART_COLORS.deviationMid;
  return CHART_COLORS.deviationLow;
}

function formatHourLabel(label: string): string {
  const match = label.match(/^(\d{2}):(\d{2})$/);
  if (!match) return label;
  const hour = Number(match[1]);
  const minute = match[2];
  if (minute !== "00") return "";
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function buildZoneDayChartOptions(args: {
  chartSeries: TrackerChartSeries[];
  timePoints: TrackerTimePoint[];
  height: number;
  theme?: TrackerChartTheme;
}): Highcharts.Options {
  const { chartSeries, timePoints, height, theme = getTrackerChartTheme(false) } = args;
  const windowTimePoints = sliceChartWindow(timePoints);
  const categories = windowTimePoints.map((point) => point.label);
  const projectedLine = buildProjectedSunLine(chartSeries, timePoints);
  const averageLine = buildZoneAverageLine(chartSeries, timePoints);
  const deviationDots = collectDeviationDots(chartSeries, timePoints);

  const trackerLines: Highcharts.SeriesOptionsType[] = chartSeries.map((series) => {
    const points = sliceChartPoints(alignTrackerSeries(timePoints, series));
    return {
      type: "spline",
      name: series.trackerName,
      data: points.map((point) => point.actual),
      color: CHART_COLORS.trackerLine,
      lineWidth: 0.9,
      connectNulls: true,
      enableMouseTracking: true,
      showInLegend: false,
      zIndex: 1,
      states: {
        hover: { lineWidthPlus: 0.5 },
        inactive: { opacity: 0.35 },
      },
    };
  });

  const series: Highcharts.SeriesOptionsType[] = [
    ...trackerLines,
    {
      type: "spline",
      name: "Zone average",
      data: averageLine,
      color: CHART_COLORS.avgActual,
      lineWidth: 2.75,
      connectNulls: true,
      zIndex: 3,
      marker: { enabled: false },
      states: { hover: { lineWidthPlus: 1 } },
    },
    {
      type: "spline",
      name: "Sun (projected)",
      data: projectedLine,
      color: CHART_COLORS.projected,
      dashStyle: "ShortDash",
      lineWidth: 2.25,
      connectNulls: true,
      zIndex: 4,
      marker: { enabled: false },
    },
    {
      type: "scatter",
      name: "Deviation",
      data: deviationDots.map((dot) => ({
        x: dot.x,
        y: dot.y,
        marker: {
          symbol: "circle",
          radius: deviationMarkerRadius(dot.deviation),
          fillColor: deviationMarkerColor(dot.deviation),
          lineWidth: 0,
          states: { hover: { radiusPlus: 1 } },
        },
        custom: { deviation: dot.deviation, trackerName: dot.trackerName },
      })),
      enableMouseTracking: true,
      showInLegend: false,
      zIndex: 5,
      tooltip: { pointFormat: "" },
    },
  ];

  return {
    chart: {
      height,
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      spacing: [8, 4, 8, 4],
      plotBorderWidth: 0,
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories,
      crosshair: {
        width: 1,
        color: "rgba(56, 189, 248, 0.35)",
        dashStyle: "Solid",
      },
      tickLength: 5,
      tickWidth: 1,
      tickColor: theme.axisLine,
      lineColor: theme.axisLine,
      min: 0,
      max: TRACKER_CHART_SLOT_COUNT - 1,
      labels: {
        style: { fontSize: "10px", color: theme.axisLabel, fontWeight: "500" },
        step: 4,
        formatter() {
          const label = categories[this.pos] ?? "";
          return formatHourLabel(label);
        },
      },
      gridLineColor: theme.gridLine,
      gridLineWidth: 1,
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        style: { fontSize: "10px", color: theme.axisLabel },
        format: "{value}°",
        x: -4,
      },
      gridLineColor: theme.gridLine,
      gridLineWidth: 1,
      startOnTick: false,
      endOnTick: false,
    },
    tooltip: {
      shared: false,
      useHTML: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      borderRadius: 6,
      style: { color: theme.tooltipText, fontSize: "12px" },
      valueDecimals: 1,
      formatter: function () {
        const ctx = this as unknown as {
          point: Highcharts.Point & {
            custom?: { deviation?: number; trackerName?: string };
          };
          series: { name: string };
          x: number;
          y: number;
        };
        const point = ctx.point;
        const timeLabel = categories[ctx.x as number] ?? "";
        if (point.custom?.deviation != null) {
          return `<span style="font-size:11px;color:${theme.tooltipMuted}">${timeLabel}</span><br/><b>${point.custom.trackerName}</b><br/>Actual <b>${point.y}°</b> · off by <b>${point.custom.deviation.toFixed(1)}°</b>`;
        }
        return `<span style="font-size:11px;color:${theme.tooltipMuted}">${timeLabel}</span><br/><b>${ctx.series.name}</b><br/><b>${ctx.y}°</b>`;
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: { inactive: { opacity: 0.25 } },
      },
      spline: { marker: { enabled: false } },
      scatter: { stickyTracking: false },
    },
    legend: { enabled: false },
    series,
  };
}
