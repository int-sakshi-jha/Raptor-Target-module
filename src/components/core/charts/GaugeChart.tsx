import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

// Requires highcharts-more at app entry level:
//   import "highcharts/highcharts-more";

export type GaugePlotBand = {
  from: number;
  to: number;
  /** Hex or rgba colour. Defaults to the built-in green/yellow/red zones. */
  color: string;
  thickness?: number;
};

export type GaugeSeries = {
  name: string;
  /** Single numeric value — the needle position. */
  value: number;
  /** Suffix shown in the tooltip and data label (e.g. " km/h"). */
  valueSuffix?: string;
  /** Override dial colour. Defaults to theme muted colour. */
  dialColor?: string;
};

type GaugeChartProps = {
  title?: string;
  subtitle?: string;
  /** Minimum y-axis value. Default: 0 */
  min?: number;
  /** Maximum y-axis value. Default: 200 */
  max?: number;
  /**
   * Coloured arc bands on the gauge track.
   * Defaults to a green / yellow / red split at 60% / 80% of max.
   */
  plotBands?: GaugePlotBand[];
  /** Arc band thickness in px. Default: 20 */
  bandThickness?: number;
  /** The data to display — one entry per gauge needle. */
  series: GaugeSeries[];
  /**
   * Gauge arc span:
   *  "half"   → 180° semi-circle (default, like a speedometer)
   *  "full"   → 270° wide arc
   */
  arcStyle?: "half" | "full";
  /** Chart height as CSS string. Default: "280px" */
  height?: string;
  isDark?: boolean;
};

// ── Default plot-band palette ─────────────────────────────────────────────────
const buildDefaultBands = (min: number, max: number): GaugePlotBand[] => {
  const range = max - min;

  return [
    { from: min,               to: min + range * 0.5, color: "#fb923c" }, // light orange
    { from: min + range * 0.5, to: min + range * 0.8, color: "#f97316" }, // primary orange
    { from: min + range * 0.8, to: max,               color: "#ea580c" }, // deep orange
  ];
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  title,
  subtitle,
  min = 0,
  max = 200,
  plotBands,
  bandThickness = 20,
  series,
  arcStyle = "half",
  height = "280px",
  isDark = false,
}) => {
  const textColor     = isDark ? "#f5f5f5"                : "#171717";
  const mutedColor    = isDark ? "#a3a3a3"                : "#737373";
  const bgColor       = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const tickColor     = isDark ? "#1a1a1a"                : "#ffffff";
  const tooltipBg     = isDark ? "rgba(0,0,0,0.75)"       : "rgba(255,255,255,0.92)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const bands = (plotBands ?? buildDefaultBands(min, max)).map((b) => ({
    from: b.from,
    to: b.to,
    color: b.color,
    thickness: b.thickness ?? bandThickness,
    borderRadius: "50%" as const,
  }));

  // Arc angles
  const startAngle = arcStyle === "full" ? -135 : -90;
  const endAngle   = arcStyle === "full" ?  135 :  89.9;

  const hcSeries: Highcharts.SeriesGaugeOptions[] = series.map((s) => ({
    type: "gauge" as const,
    name: s.name,
    data: [s.value],
    tooltip: {
      valueSuffix: s.valueSuffix ?? "",
    },
    dataLabels: {
      format: `{y}${s.valueSuffix ?? ""}`,
      borderWidth: 0,
      style: {
        fontSize: "18px",
        fontWeight: "600",
        color: textColor,
        fontFamily: "inherit",
        textOutline: "none",
      },
    },
    dial: {
      radius: "80%",
      backgroundColor: s.dialColor ?? mutedColor,
      baseWidth: 10,
      baseLength: "0%",
      rearLength: "0%",
    },
    pivot: {
      backgroundColor: s.dialColor ?? mutedColor,
      radius: 6,
    },
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "gauge",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      animation: { duration: 800 },
      plotBackgroundColor: undefined,
      plotBackgroundImage: undefined,
      plotBorderWidth: 0,
      plotShadow: false,
      height,
      margin: [0, 0, 0, 0],
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
      startAngle,
      endAngle,
      background: [{
        backgroundColor: bgColor,
        innerRadius: "60%",
        outerRadius: "100%",
        shape: "arc",
        borderWidth: 0,
      }],
      center: ["50%", arcStyle === "half" ? "75%" : "60%"],
      size: "100%",
    },

    yAxis: {
      min,
      max,
      tickPixelInterval: 72,
      tickPosition: "inside",
      tickColor,
      tickLength: 20,
      tickWidth: 2,
      minorTickInterval: undefined,
      lineWidth: 0,
      labels: {
        distance: 20,
        style: {
          color: mutedColor,
          fontSize: "12px",
          fontFamily: "inherit",
        },
      },
      plotBands: bands,
    },

    tooltip: {
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

    series: hcSeries as Highcharts.SeriesOptionsType[],

    credits: { enabled: false },
  };

  return (
    <div style={{ overflow: "hidden" }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default React.memo(GaugeChart);