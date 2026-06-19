/**
 * Overview tab: visual snapshot only (heatmap + charts).
 * Detailed table → Table tab · Full-day tracking → Graph tab.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import {
  buildTrackerSnapshots,
  TRACKER_DEVIATION_WARN_DEG,
  type TrackerSnapshot,
  type TrackerZoneLiveBundle,
} from "@/lib/plant/trackerLiveData";
import ColorBadge from "@/components/common/ColorBadge";
import { useTrackerChartTheme } from "@/lib/plant/trackerChartTheme";
import {
  deviationBadgeNode,
  formatTrackerAngle,
  TRACKER_STATUS_STYLES,
  TrackerSectionCard,
  TrackerStatusBadge,
  trackerStatusBadgeVariant,
} from "./trackerUi";

const initMore = HighchartsMore as unknown as
  | ((hc: typeof Highcharts) => void)
  | { default: (hc: typeof Highcharts) => void };
if (typeof initMore === "function") initMore(Highcharts);
else if (initMore?.default) initMore.default(Highcharts);

/** Fixed tall height — deviation chart does not scale with tracker count. */
const DEVIATION_CHART_HEIGHT = 320;
/** Per-tracker row height inside the scrollable projected vs actual chart. */
const ANGLE_ROW_HEIGHT = 28;
const ANGLE_CHART_MIN_HEIGHT = 160;

// ─── Status heatmap ──────────────────────────────────────────────────────────

interface HeatmapTooltipProps {
  tracker: TrackerSnapshot | null;
  visible: boolean;
  x: number;
  y: number;
}

const HeatmapTooltip: React.FC<HeatmapTooltipProps> = ({ tracker, visible, x, y }) => {
  if (!visible || !tracker) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[180px] rounded-md border border-neutral-200/80 bg-white px-3 py-2 shadow-lg dark:border-neutral-dark-200 dark:bg-neutral-dark-100"
      style={{ left: x + 14, top: y - 10 }}
    >
      <p className="mb-1 text-[11px] font-semibold text-neutral-900 dark:text-neutral-dark-950">
        {tracker.name}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
        <span className="text-neutral-500 dark:text-neutral-dark-500">Projected</span>
        <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-dark-950">
          {formatTrackerAngle(tracker.projectedAngle)}
        </span>
        <span className="text-neutral-500 dark:text-neutral-dark-500">Actual</span>
        <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-dark-950">
          {formatTrackerAngle(tracker.actualAngle)}
        </span>
        <span className="text-neutral-500 dark:text-neutral-dark-500">Deviation</span>
        <span className="font-medium tabular-nums">
          {deviationBadgeNode(tracker.signedDeviation)}
        </span>
      </div>
      <div className="mt-1.5 flex justify-center">
        <TrackerStatusBadge status={tracker.status} />
      </div>
    </div>
  );
};

function heatmapColumnCount(
  trackerCount: number,
  isMobile: boolean,
  isTablet: boolean,
): number {
  const maxCols = isMobile ? 7 : isTablet ? 12 : 20;
  const minCols = isMobile ? 4 : 6;
  return Math.min(maxCols, Math.max(minCols, trackerCount));
}

const StatusHeatmap: React.FC<{ snapshots: TrackerSnapshot[] }> = ({ snapshots }) => {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");

  const [tooltip, setTooltip] = useState<{
    tracker: TrackerSnapshot | null;
    visible: boolean;
    x: number;
    y: number;
  }>({ tracker: null, visible: false, x: 0, y: 0 });

  const cols = useMemo(
    () => heatmapColumnCount(snapshots.length, isMobile, isTablet),
    [isMobile, isTablet, snapshots.length],
  );

  if (snapshots.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-dark-500">
        No tracker data
      </p>
    );
  }

  const counts = {
    ok: snapshots.filter((s) => s.status === "ok").length,
    warning: snapshots.filter((s) => s.status === "warning").length,
    critical: snapshots.filter((s) => s.status === "critical").length,
    unknown: snapshots.filter((s) => s.status === "unknown").length,
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-neutral-500 dark:text-neutral-dark-500">
        {(["ok", "warning", "critical", "unknown"] as const).map((key) => {
          if (key === "unknown" && counts.unknown === 0) return null;
          const style = TRACKER_STATUS_STYLES[key];
          return (
            <span key={key} className="flex items-center gap-1.5">
              <ColorBadge variant={trackerStatusBadgeVariant(key)}>
                {style.label} ({counts[key]})
              </ColorBadge>
            </span>
          );
        })}
      </div>

      <div
        className="grid gap-1 sm:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {snapshots.map((tracker) => (
          <div
            key={tracker.id}
            className="aspect-square min-h-[32px] cursor-pointer rounded-[4px] transition-transform active:scale-110 sm:min-h-[22px] sm:rounded-[3px] md:min-h-[18px] lg:min-h-[14px] hover:z-10 hover:scale-110"
            style={{ background: TRACKER_STATUS_STYLES[tracker.status].fill }}
            title={tracker.name}
            onMouseEnter={(e) =>
              setTooltip({ tracker, visible: true, x: e.clientX, y: e.clientY })
            }
            onMouseMove={(e) =>
              setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }))
            }
            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              if (!touch) return;
              setTooltip({ tracker, visible: true, x: touch.clientX, y: touch.clientY });
            }}
            onTouchEnd={() => setTooltip((prev) => ({ ...prev, visible: false }))}
          />
        ))}
      </div>

      <HeatmapTooltip
        tracker={tooltip.tracker}
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
      />
    </>
  );
};

// ─── Deviation chart (fixed height, full width) ───────────────────────────────

const DeviationBarChart: React.FC<{ snapshots: TrackerSnapshot[] }> = ({ snapshots }) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const theme = useTrackerChartTheme();
  const withDeviation = snapshots.filter((s) => s.signedDeviation != null);

  const options = useMemo((): Highcharts.Options => {
    return {
      chart: {
        type: "column",
        height: DEVIATION_CHART_HEIGHT,
        animation: false,
        style: { fontFamily: "inherit" },
        backgroundColor: "transparent",
        plotBackgroundColor: "transparent",
        margin: [12, 12, withDeviation.length > 16 ? 48 : withDeviation.length > 8 ? 36 : 28, 48],
        spacing: [0, 0, 0, 0],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        style: { color: theme.tooltipText, fontSize: "11px" },
        formatter: function () {
          const ctx = this as { y?: number; point?: { name?: string }; key?: string };
          const dev = ctx.y ?? 0;
          const name = ctx.point?.name ?? ctx.key ?? "";
          const sign = dev > 0 ? "+" : "";
          return `<b>${name}</b><br/>${sign}${dev.toFixed(1)}°`;
        },
      },
      xAxis: {
        categories: withDeviation.map((s) => s.name),
        labels: {
          enabled: withDeviation.length <= 20,
          rotation: -40,
          style: { fontSize: "9px", color: theme.axisLabel },
        },
        lineColor: theme.axisLine,
        tickColor: theme.axisLine,
        tickLength: 0,
        gridLineColor: theme.gridLine,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: theme.gridLine,
        gridLineWidth: 1,
        labels: { style: { fontSize: "9px", color: theme.axisLabel }, format: "{value}°" },
        plotLines: [{ value: 0, color: theme.plotLine, width: 1 }],
        max: Math.max(TRACKER_DEVIATION_WARN_DEG + 2, ...withDeviation.map((s) => Math.abs(s.signedDeviation!))),
        min: -Math.max(TRACKER_DEVIATION_WARN_DEG + 2, ...withDeviation.map((s) => Math.abs(s.signedDeviation!))),
      },
      plotOptions: {
        column: { borderRadius: 2, borderWidth: 0, groupPadding: 0.08, pointPadding: 0.04 },
      },
      series: [
        {
          type: "column",
          name: "Deviation",
          data: withDeviation.map((s) => ({
            y: s.signedDeviation!,
            name: s.name,
            color: TRACKER_STATUS_STYLES[s.status].fill,
          })),
        },
      ],
    };
  }, [theme, withDeviation]);

  useLayoutEffect(() => {
    const chart = chartRef.current?.chart;
    if (chart) requestAnimationFrame(() => chart.reflow());
  }, [options]);

  if (withDeviation.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-dark-500">
        No deviation data
      </p>
    );
  }

  return <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} immutable={false} />;
};

// ─── Angle compare (dynamic height, scrollable) ──────────────────────────────

const AngleCompareChart: React.FC<{ snapshots: TrackerSnapshot[] }> = ({ snapshots }) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const theme = useTrackerChartTheme();

  const valid = useMemo(
    () => snapshots.filter((s) => s.projectedAngle != null || s.actualAngle != null),
    [snapshots],
  );

  const chartHeight = Math.max(
    ANGLE_CHART_MIN_HEIGHT,
    valid.length * ANGLE_ROW_HEIGHT + 80,
  );

  const options = useMemo((): Highcharts.Options => {
    return {
      chart: {
        type: "bar",
        height: chartHeight,
        animation: false,
        style: { fontFamily: "inherit" },
        backgroundColor: "transparent",
        plotBackgroundColor: "transparent",
        margin: [8, 12, 8, 100],
        spacing: [0, 0, 0, 0],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: "right",
        verticalAlign: "top",
        itemStyle: { fontSize: "10px", color: theme.legend },
        itemHoverStyle: { color: theme.tooltipText },
      },
      tooltip: {
        shared: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        style: { color: theme.tooltipText, fontSize: "11px" },
        formatter: function () {
          const ctx = this as unknown as {
            x?: string | number;
            points?: Array<{ color?: string; series: { name: string }; y?: number }>;
          };
          const pts = ctx.points ?? [];
          const name = String(ctx.x ?? "");
          let html = `<b>${name}</b><br/>`;
          pts.forEach((p) => {
            html += `<span style="color:${p.color}">\u25CF</span> ${p.series.name}: <b>${Number(p.y).toFixed(1)}°</b><br/>`;
          });
          return html;
        },
      },
      xAxis: {
        categories: valid.map((s) => s.name),
        labels: { style: { fontSize: "10px", color: theme.axisLabel } },
        lineColor: theme.axisLine,
        tickColor: theme.axisLine,
        gridLineColor: theme.gridLine,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: theme.gridLine,
        gridLineWidth: 1,
        labels: { style: { fontSize: "10px", color: theme.axisLabel }, format: "{value}°" },
      },
      series: [
        {
          type: "bar",
          name: "Projected",
          data: valid.map((s) => s.projectedAngle),
          color: "#38bdf8",
          borderWidth: 0,
          borderRadius: 2,
        },
        {
          type: "bar",
          name: "Actual",
          data: valid.map((s) => s.actualAngle),
          color: "#1D9E75",
          borderWidth: 0,
          borderRadius: 2,
        },
      ],
    };
  }, [chartHeight, theme, valid]);

  useLayoutEffect(() => {
    const chart = chartRef.current?.chart;
    if (chart) requestAnimationFrame(() => chart.reflow());
  }, [options]);

  if (valid.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-dark-500">
        No angle data
      </p>
    );
  }

  return (
    <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} immutable={false} />
  );
};

// ─── TrackerOverviewPanel ────────────────────────────────────────────────────

export interface TrackerOverviewPanelProps {
  bundle: TrackerZoneLiveBundle | null;
  search?: string;
  isLoading?: boolean;
}

export const TrackerOverviewPanel: React.FC<TrackerOverviewPanelProps> = ({
  bundle,
  search = "",
  isLoading = false,
}) => {
  const snapshots = useMemo(() => buildTrackerSnapshots(bundle, search), [bundle, search]);

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] flex-1 items-center justify-center text-sm text-neutral-400 dark:text-neutral-dark-500">
        Loading tracker data…
      </div>
    );
  }

  if (!bundle || snapshots.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-1 items-center justify-center text-sm text-neutral-400 dark:text-neutral-dark-500">
        {!bundle ? "Select a zone" : "No trackers match your search"}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      <TrackerSectionCard title="Status at a glance">
        <StatusHeatmap snapshots={snapshots} />
      </TrackerSectionCard>

      <TrackerSectionCard title="Deviation per tracker" bodyClassName="!p-2">
        <DeviationBarChart snapshots={snapshots} />
      </TrackerSectionCard>

      <TrackerSectionCard title="Projected vs actual" bodyClassName="!p-2">
        <AngleCompareChart snapshots={snapshots} />
      </TrackerSectionCard>
    </div>
  );
};
