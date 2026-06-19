/**
 * Full-day per-zone angle time-series charts (Graph tab + overview section).
 */

import React, { useLayoutEffect, useMemo, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import type { TrackerZoneLiveBundle, TrackerZoneTelemetry } from "@/lib/plant/trackerLiveData";
import { TRACKER_DEVIATION_OK_DEG } from "@/lib/plant/trackerLiveData";
import { useTrackerChartTheme } from "@/lib/plant/trackerChartTheme";
import { TRACKER_H_SCROLL } from "./trackerUi";
import {
  buildZoneDayChartOptions,
  computeZoneChartKpis,
  filterChartSeries,
  normalizeChartSeriesList,
  zoneHasPlottableData,
  type TrackerZoneChartKpis,
} from "@/lib/plant/trackerChartUtils";

const initMore = HighchartsMore as unknown as
  | ((hc: typeof Highcharts) => void)
  | { default: (hc: typeof Highcharts) => void };
if (typeof initMore === "function") initMore(Highcharts);
else if (initMore?.default) initMore.default(Highcharts);

const DAY_CHART_HEIGHT = 340;
const DAY_CHART_HEIGHT_EMBEDDED = 300;

// ─── KPI tiles ───────────────────────────────────────────────────────────────

const KpiTile: React.FC<{
  label: string;
  value: string;
  hint: string;
  tone?: "brand" | "success" | "sky" | "warning";
  compact?: boolean;
  className?: string;
}> = ({ label, value, hint, tone = "brand", compact = false, className = "" }) => {
  const valueColor =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "sky"
        ? "text-sky-600 dark:text-sky-400"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "text-brand-600 dark:text-brand-400";

  return (
    <div
      className={`rounded-[4px] border border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/30 ${compact ? "px-2.5 py-1.5" : "px-3 py-2"} ${className}`.trim()}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-dark-500">
        {label}
      </p>
      <p
        className={`font-semibold tabular-nums ${valueColor} ${compact ? "text-base" : "text-lg"}`}
      >
        {value}
      </p>
      {!compact && (
        <p className="text-[10px] text-neutral-500 dark:text-neutral-dark-500">{hint}</p>
      )}
    </div>
  );
};

const TrackerKpiRow: React.FC<{ kpis: TrackerZoneChartKpis; compact?: boolean }> = ({
  kpis,
  compact = false,
}) => (
  <div
    className={`flex gap-2 ${TRACKER_H_SCROLL} sm:grid sm:overflow-visible ${compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-4"}`}
  >
    <KpiTile
      className="min-w-[128px] shrink-0 sm:min-w-0 sm:shrink"
      label="Efficiency"
      value={`${kpis.trackingEfficiencyPct}%`}
      hint={`Within ±${TRACKER_DEVIATION_OK_DEG}°`}
      compact={compact}
    />
    <KpiTile
      className="min-w-[128px] shrink-0 sm:min-w-0 sm:shrink"
      label="Avg deviation"
      value={kpis.avgDeviationDeg != null ? `${kpis.avgDeviationDeg}°` : "—"}
      hint="Today"
      tone="success"
      compact={compact}
    />
    <KpiTile
      className="min-w-[128px] shrink-0 sm:min-w-0 sm:shrink"
      label="Peak sun"
      value={kpis.peakProjectedDeg != null ? `${kpis.peakProjectedDeg}°` : "—"}
      hint="Max projected"
      tone="sky"
      compact={compact}
    />
    <KpiTile
      className="min-w-[128px] shrink-0 sm:min-w-0 sm:shrink"
      label="Max deviation"
      value={kpis.maxDeviationDeg != null ? `${kpis.maxDeviationDeg}°` : "—"}
      hint="Worst moment"
      tone="warning"
      compact={compact}
    />
  </div>
);

// ─── Chart legend ────────────────────────────────────────────────────────────

const ChartLegend: React.FC<{ trackerCount: number; compact?: boolean }> = ({
  trackerCount,
  compact = false,
}) => (
  <div
    className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-neutral-200/70 bg-neutral-50/40 dark:border-neutral-dark-200 dark:bg-neutral-dark-200/20 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
  >
    <p className="text-[10px] text-neutral-500 dark:text-neutral-dark-500">
      <span className="font-medium text-neutral-700 dark:text-neutral-dark-300">6 AM – 8 PM</span>
      <span className="mx-1 text-neutral-300">·</span>
      15 min
      <span className="mx-1 text-neutral-300">·</span>
      {trackerCount} tracker{trackerCount !== 1 ? "s" : ""}
    </p>
    <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-neutral-500 dark:text-neutral-dark-500">
      <span className="flex items-center gap-1">
        <span className="inline-block h-[2px] w-4 rounded-full bg-sky-400" />
        Avg
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" style={{ height: 0 }} />
        Sun
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-[2px] w-4 rounded-full bg-sky-400/25" />
        Trackers
      </span>
    </div>
  </div>
);

// ─── Zone day chart ──────────────────────────────────────────────────────────

interface ZoneDayChartProps {
  chartSeries: ReturnType<typeof normalizeChartSeriesList>;
  timePoints: TrackerZoneTelemetry["timePoints"];
  trackerCount: number;
  embedded?: boolean;
}

const ZoneDayChart: React.FC<ZoneDayChartProps> = ({
  chartSeries,
  timePoints,
  trackerCount,
  embedded = false,
}) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const theme = useTrackerChartTheme();
  const height = embedded ? DAY_CHART_HEIGHT_EMBEDDED : DAY_CHART_HEIGHT;

  const chartOptions = useMemo(
    () => buildZoneDayChartOptions({ chartSeries, timePoints, height, theme }),
    [chartSeries, height, theme, timePoints],
  );

  useLayoutEffect(() => {
    const chart = chartRef.current?.chart;
    if (!chart) return;
    requestAnimationFrame(() => chart.reflow());
  }, [chartOptions]);

  if (!zoneHasPlottableData(chartSeries, timePoints)) {
    return (
      <div
        className={`flex items-center justify-center rounded-[4px] border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-dark-300 dark:text-neutral-dark-500 ${embedded ? "h-[200px]" : "h-[260px]"}`}
      >
        Waiting for angle data (6 AM – 8 PM)…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-neutral-200/80 bg-neutral-0 dark:border-neutral-dark-200 dark:bg-neutral-dark-100">
      <ChartLegend trackerCount={trackerCount} compact={embedded} />
      <div className="px-0.5 pb-1 pt-0.5">
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={chartOptions}
          immutable={false}
        />
      </div>
    </div>
  );
};

// ─── Per-component charts ────────────────────────────────────────────────────

interface TrackerComponentChartsProps {
  telemetry: TrackerZoneTelemetry;
  trackerSearch: string;
  embedded?: boolean;
}

const TrackerComponentCharts: React.FC<TrackerComponentChartsProps> = ({
  telemetry,
  trackerSearch,
  embedded = false,
}) => {
  const { chartSeries: rawChartSeries, timePoints, componentName } = telemetry;

  const chartSeries = useMemo(
    () => filterChartSeries(normalizeChartSeriesList(rawChartSeries), trackerSearch),
    [rawChartSeries, trackerSearch],
  );

  const kpis = useMemo(
    () => computeZoneChartKpis(chartSeries, timePoints),
    [chartSeries, timePoints],
  );

  if (rawChartSeries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-dark-500">
        No chart data for {componentName}
      </p>
    );
  }

  if (chartSeries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-dark-500">
        No trackers match search
      </p>
    );
  }

  return (
    <div className={`flex flex-col ${embedded ? "gap-2" : "gap-3"}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-dark-500">
          {componentName}
        </span>
        <span className="h-px flex-1 bg-neutral-200/70 dark:bg-neutral-dark-200" />
      </div>
      <TrackerKpiRow kpis={kpis} compact={embedded} />
      <ZoneDayChart
        chartSeries={chartSeries}
        timePoints={timePoints}
        trackerCount={chartSeries.length}
        embedded={embedded}
      />
    </div>
  );
};

// ─── GraphView ───────────────────────────────────────────────────────────────

export interface GraphViewProps {
  bundle: TrackerZoneLiveBundle | null;
  search?: string;
  embedded?: boolean;
}

export const GraphView: React.FC<GraphViewProps> = ({
  bundle,
  search = "",
  embedded = false,
}) => {
  if (!bundle) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-dark-500">
        Select a zone
      </div>
    );
  }

  if (bundle.trackerTelemetry.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-1 items-center justify-center px-4 text-center text-sm text-neutral-500 dark:text-neutral-dark-500">
        No indexed tracker arrays in live data
      </div>
    );
  }

  const content = bundle.trackerTelemetry.map((telemetry) => (
    <TrackerComponentCharts
      key={`${bundle.zone.parentId}-${telemetry.componentId}`}
      telemetry={telemetry}
      trackerSearch={search}
      embedded={embedded}
    />
  ));

  if (embedded) {
    return <div className="flex flex-col gap-3">{content}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">{content}</div>
  );
};

export type { TrackerZoneLiveBundle };
