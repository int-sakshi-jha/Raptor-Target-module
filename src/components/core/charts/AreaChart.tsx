import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

export type AreaSeries = {
  name: string;
  data: (number | null | Highcharts.PointOptionsObject)[];
  color?: string;
  fillColor?: string | Highcharts.GradientColorObject;
  fillOpacity?: number;
  marker?: Highcharts.PointMarkerOptionsObject;
  pointStart?: number;
};

type AreaChartProps = {
  title?: string;
  subtitle?: string;
  /** Pass categories array OR use pointStart on each series for numeric x-axes */
  categories?: string[];
  xAxisTitle?: string;
  xAxisDescription?: string;
  yAxisTitle?: string;
  yAxisSuffix?: string;
  /** Custom tooltip point format. Supports Highcharts format strings. */
  tooltipPointFormat?: string;
  series: AreaSeries[];
  /** Default fill opacity applied to all series (can be overridden per series) */
  defaultFillOpacity?: number;
  /** Allow decimal values on x-axis (default: false) */
  allowDecimalsX?: boolean;
  isDark?: boolean;
  accessibilityDescription?: string;
};

// A palette of visually distinct colours used when series don't specify their own.
const DEFAULT_COLORS_LIGHT = [
  "rgba(233,113,36,0.9)",
  "rgba(59,130,246,0.9)",
  "rgba(16,185,129,0.9)",
  "rgba(168,85,247,0.9)",
  "rgba(239,68,68,0.9)",
];

const DEFAULT_COLORS_DARK = [
  "rgba(249,115,22,0.9)",
  "rgba(96,165,250,0.9)",
  "rgba(52,211,153,0.9)",
  "rgba(192,132,252,0.9)",
  "rgba(248,113,113,0.9)",
];

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const AreaChart: React.FC<AreaChartProps> = ({
  title,
  subtitle,
  categories,
  xAxisTitle,
  xAxisDescription,
  yAxisTitle,
  yAxisSuffix = "",
  tooltipPointFormat,
  series,
  defaultFillOpacity = 0.15,
  allowDecimalsX = false,
  isDark = false,
  accessibilityDescription,
}) => {
  const textColor      = isDark ? "#f5f5f5"                  : "#171717";
  const mutedColor     = isDark ? "#a3a3a3"                  : "#737373";
  const gridColor      = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const crosshairColor = isDark ? "rgba(255,255,255,0.15)"   : "rgba(0,0,0,0.12)";
  const tooltipBg      = isDark ? "rgba(0,0,0,0.75)"         : "rgba(255,255,255,0.82)";
  const tooltipBorder  = isDark ? "rgba(255,255,255,0.12)"   : "rgba(0,0,0,0.10)";
  const palette        = isDark ? DEFAULT_COLORS_DARK        : DEFAULT_COLORS_LIGHT;

  const chartRef     = React.useRef<HighchartsReact.RefObject>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Build a gradient fill for a given base colour if fillColor isn't provided.
  const buildGradientFill = (
    color: string,
    opacity: number
  ): Highcharts.GradientColorObject => ({
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, color.replace(/[\d.]+\)$/, `${opacity})`).replace(/rgba?\(/, "rgba(")],
      [1, color.replace(/[\d.]+\)$/, "0)").replace(/rgba?\(/, "rgba(")],
    ],
  });

  // Enrich each series with default colour + gradient fill when not supplied.
  const enrichedSeries: Highcharts.SeriesOptionsType[] = series.map(
    (s, i): Highcharts.SeriesAreaOptions => {
      const baseColor = s.color ?? palette[i % palette.length];
      return {
        type: "area",
        name: s.name,
        data: s.data as Highcharts.SeriesAreaOptions["data"],
        color: baseColor,
        fillColor: s.fillColor ?? buildGradientFill(baseColor, defaultFillOpacity),
        fillOpacity: s.fillOpacity,
        marker: s.marker ?? {
          enabled: false,
          symbol: "circle",
          radius: 3,
          states: { hover: { enabled: true } },
        },
        ...(s.pointStart !== undefined ? { pointStart: s.pointStart } : {}),
      };
    }
  );

  const options: Highcharts.Options = {
    chart: {
      type: "area",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      animation: { duration: 400 },
      zooming: { type: "x" },
      panning: { enabled: true, type: "x" },
      panKey: "shift",
    },

    accessibility: {
      description: accessibilityDescription,
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

    xAxis: {
      ...(categories ? { categories } : {}),
      allowDecimals: allowDecimalsX,
      title: xAxisTitle
        ? { text: xAxisTitle, style: { color: mutedColor, fontSize:isMobile? "7px" : "11px" } }
        : undefined,
      crosshair: { color: crosshairColor, width: 1, dashStyle: "Dash" },
      labels: { style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" } },
      lineColor: gridColor,
      tickColor: gridColor,
      accessibility: xAxisDescription
        ? { description: xAxisDescription }
        : undefined,
    },

    yAxis: {
      title: {
        text: yAxisTitle,
        style: { color: mutedColor, fontSize:isMobile? "7px" : "11px" },
      },
      labels: {
        format: `{value}${yAxisSuffix}`,
        style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" },
      },
      gridLineColor: gridColor,
      gridLineDashStyle: "ShortDash",
    },

    tooltip: {
      shared: true,
      ...(tooltipPointFormat ? { pointFormat: tooltipPointFormat } : { valueSuffix: yAxisSuffix }),
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
      itemStyle: {
        color: textColor,
        fontWeight: "500",
        fontSize: "12px",
      },
      itemHoverStyle: { color: palette[0] },
    },

    plotOptions: {
      area: {
        lineWidth: 2,
        states: {
          hover: { lineWidth: 2 },
        },
      },
    },

    series: enrichedSeries,

    credits: { enabled: false },
  };

  // Scroll-to-zoom behaviour (mirrors LineChart).
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!chartRef.current?.chart) return;
      const chart = chartRef.current.chart;
      const xAxis = chart.xAxis[0];
      const { min, max, dataMin, dataMax } = xAxis.getExtremes();

      if (
        min === undefined ||
        max === undefined ||
        dataMin === undefined ||
        dataMax === undefined
      ) return;

      e.preventDefault();
      e.stopPropagation();

      const zoomFactor  = e.deltaY > 0 ? 0.8 : 1.2;
      const currentRange = max - min;
      const newRange     = currentRange * zoomFactor;
      const totalRange   = dataMax - dataMin;
      const minRange     = totalRange * 0.01;
      const maxRange     = totalRange;
      const limitedRange = Math.max(minRange, Math.min(maxRange, newRange));
      const center       = (max + min) / 2;

      const newMin = Math.max(dataMin, center - limitedRange / 2);
      const newMax = Math.min(dataMax, center + limitedRange / 2);

      xAxis.setExtremes(newMin, newMax);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div ref={containerRef} style={{ overflow: "hidden", touchAction: "none" }}>
      <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
    </div>
  );
};

export default React.memo(AreaChart);