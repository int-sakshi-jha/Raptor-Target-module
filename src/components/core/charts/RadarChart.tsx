import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// Highcharts' polar/radar support lives in the core but needs the "more" module
// for full spider-web grid lines. Import once at app level if not already done:
//   import "highcharts/highcharts-more";

export type RadarSeries = {
  name: string;
  data: number[];
  color?: string;
  fillColor?: string | Highcharts.GradientColorObject;
  /** Per-series fill opacity (0–1). Overrides defaultFillOpacity. */
  fillOpacity?: number;
  /** Per-series line width. Overrides defaultLineWidth. */
  lineWidth?: number;
  /** Per-series marker options. */
  marker?: Highcharts.PointMarkerOptionsObject;
};

type RadarChartProps = {
  title?: string;
  subtitle?: string;
  /** Axis labels around the polygon — one per data point. */
  categories: string[];
  /** Minimum y-axis value. Default: 0 */
  yMin?: number;
  /** Maximum y-axis value. Default: 100 */
  yMax?: number;
  /** Number of concentric grid rings. Default: 5 */
  tickAmount?: number;
  /** Suffix appended to tick labels and tooltip values (e.g. " pts"). */
  yAxisSuffix?: string;
  /** Title label shown beside the radial (y) axis. */
  yAxisTitle?: string;
  /** Tooltip label for each value row. Default: "Rating" */
  valueLabel?: string;
  series: RadarSeries[];
  /**
   * "filled"  → solid fill inside the polygon (default, matches screenshot).
   * "line"    → outline only, no fill.
   */
  chartStyle?: "filled" | "line";
  /** Fill opacity for all series when chartStyle="filled". Default: 0.55 */
  defaultFillOpacity?: number;
  /** Line width for all series. Default: 2 */
  defaultLineWidth?: number;
  isDark?: boolean;
};

// ── Palettes ──────────────────────────────────────────────────────────────────
const DEFAULT_COLORS_LIGHT = [
  "#e97124",  // orange  (matches screenshot)
  "#1d6fcc",  // blue
  "#0e9e6e",  // teal
  "#7c3aed",  // violet
  "#b91c1c",  // red
];

const DEFAULT_COLORS_DARK = [
  "#f97316",  // vivid orange
  "#3b9eff",  // vivid blue
  "#10d98a",  // vivid green
  "#a78bfa",  // soft violet
  "#f87171",  // soft red
];

/** Convert a hex or rgba colour string to a clean `r,g,b` triple. */
const toRGB = (color: string): string => {
  if (color.startsWith("#")) {
    const n = parseInt(color.replace("#", ""), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const m = color.match(/[\d.]+/g) ?? ["0", "0", "0"];
  return `${m[0]},${m[1]},${m[2]}`;
};

const RadarChart: React.FC<RadarChartProps> = ({
  title,
  subtitle,
  categories,
  yMin = 0,
  yMax = 100,
  tickAmount = 5,
  yAxisSuffix = "",
  yAxisTitle,
//   valueLabel = "Rating",
  series,
  chartStyle = "filled",
  defaultFillOpacity = 0.55,
  defaultLineWidth = 2,
  isDark = false,
}) => {
  const textColor      = isDark ? "#f5f5f5"                : "#171717";
  const mutedColor     = isDark ? "#a3a3a3"                : "#737373";
  const gridColor      = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const tooltipBg      = isDark ? "rgba(0,0,0,0.75)"       : "rgba(255,255,255,0.92)";
  const tooltipBorder  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const palette        = isDark ? DEFAULT_COLORS_DARK      : DEFAULT_COLORS_LIGHT;

  const enrichedSeries: Highcharts.SeriesOptionsType[] = series.map(
    (s, i): Highcharts.SeriesAreaOptions => {
      const baseColor = s.color ?? palette[i % palette.length];
      const opacity   = s.fillOpacity ?? defaultFillOpacity;
      const rgb       = toRGB(baseColor);

      const fillColor: string | Highcharts.GradientColorObject | undefined =
        chartStyle === "filled"
          ? (s.fillColor ?? `rgba(${rgb}, ${opacity})`)
          : "rgba(0,0,0,0)"; // transparent for line-only style

      return {
        type: "area",
        name: s.name,
        data: s.data,
        color: baseColor,
        fillColor,
        lineWidth: s.lineWidth ?? defaultLineWidth,
        marker: s.marker ?? {
          enabled: true,
          symbol: "circle",
          radius: 4,
          lineColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.6)",
          lineWidth: 1.5,
          states: { hover: { enabled: true, radius: 6 } },
        },
      };
    }
  );

  const options: Highcharts.Options = {
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      animation: { duration: 400 },
      // Give enough margin so axis labels aren't clipped
      margin: [30, 60, 30, 60],
    },

    title: {
      text: title,
      style: { color: textColor, fontSize: "14px", fontWeight: "600" },
    },

    subtitle: {
      text: subtitle,
      useHTML: true,
      style: { color: mutedColor, fontSize: "12px" },
    },

    pane: {
      size: "75%",
      background: [{
        backgroundColor: "transparent",
        borderWidth: 0,
      }],
    },

    xAxis: {
      categories,
      tickmarkPlacement: "on",
      lineWidth: 0,
      gridLineColor: gridColor,
      gridLineWidth: 1,
      labels: {
        style: { color: mutedColor, fontSize: "11px" },
        distance: 16,
      },
    },

    yAxis: {
      gridLineInterpolation: "polygon",
      gridLineColor: gridColor,
      gridLineWidth: 1,
      lineWidth: 0,
      min: yMin,
      max: yMax,
      tickAmount,
      title: yAxisTitle
        ? { text: yAxisTitle, style: { color: mutedColor, fontSize: "11px" } }
        : undefined,
      labels: {
        format: `{value}${yAxisSuffix}`,
        style: { color: mutedColor, fontSize: "10px" },
        // Nudge numeric labels slightly inward so they sit on the rings
        x: 3,
      },
    },

    tooltip: {
      shared: true,
      headerFormat: `<span style="font-size:11px;font-weight:600;color:${mutedColor}">{point.key}</span><br/>`,
      pointFormat: `<span style="color:{series.color}">●</span> {series.name}: <b>{point.y}${yAxisSuffix}</b><br/>`,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 12,
      style: { color: textColor, fontSize: "12px" },
      shadow: {
        color: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.10)",
        offsetX: 0,
        offsetY: 4,
        opacity: 1,
        width: 20,
      },
    },

    legend: {
      // Only show legend when there are multiple series
      enabled: series.length > 1,
      itemStyle: { color: textColor, fontWeight: "500", fontSize: "12px" },
      itemHoverStyle: { color: palette[0] },
    },

    plotOptions: {
      area: {
        // Close the polygon back to the first point
        pointPlacement: "on",
      },
    },

    series: enrichedSeries,

    credits: { enabled: false },
  };

  return (
    <div style={{ overflow: "hidden" }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default React.memo(RadarChart);