// src/components/core/charts/PieChart.tsx
import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/variable-pie";
import "highcharts/modules/accessibility";

export type PiePoint = {
  name: string;
  /** Slice arc size — the "main" value (e.g. area) */
  y: number;
  /** Slice radius size — the "secondary" value (e.g. density) */
  z: number;
  color?: string;
};

export type PieSeries = {
  name?: string;
  data: PiePoint[];
  /** Override the auto colour palette */
  colors?: string[];
  innerSize?: string; // e.g. "20%"
  minPointSize?: number;
  zMin?: number;
  borderRadius?: number;
};

type PieChartProps = {
  title?: string;
  subtitle?: string;
  /** Tooltip line for the y value — e.g. "Area (sq km)" */
  yLabel?: string;
  /** Tooltip line for the z value — e.g. "Population density" */
  zLabel?: string;
  series: PieSeries[];
  isDark?: boolean;
};

const COLORS_LIGHT = [
  "#e97124", 
  "#f59346", 
  "#fbb174",
  "#fdd0a8",
  "#c45e1a",
  "#a84d10",
  "#d4622b",
  "#7a3a0a",
];

const COLORS_DARK = [
  "#f97316", 
  "#fb923c",
  "#fdba74",
  "#fcd4a0",
  "#ea6c0a",
  "#c2601a",
  "#e8490a",
  "#7c3010",
];

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const PieChart: React.FC<PieChartProps> = ({
  title,
  subtitle,
  yLabel = "Value",
  zLabel = "Size",
  series,
  isDark = false,
}) => {
  const textColor      = isDark ? "#f5f5f5"                : "#171717";
  const mutedColor     = isDark ? "#a3a3a3"                : "#737373";
  const tooltipBg      = isDark ? "rgba(0,0,0,0.75)"       : "rgba(255,255,255,0.82)";
  const tooltipBorder  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const hcSeries: Highcharts.SeriesOptionsType[] = series.map((s) => ({
    type: "variablepie" as const,
    name: s.name ?? "Series",
    minPointSize: s.minPointSize ?? 10,
    innerSize: s.innerSize ?? "20%",
    zMin: s.zMin ?? 0,
    borderRadius: s.borderRadius ?? 5,
    borderColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)",
    borderWidth: 1,
    colors: s.colors ?? (isDark ? COLORS_DARK : COLORS_LIGHT),
    data: s.data,
    dataLabels: {
      enabled: true,
      format: isMobile ? "{point.name}" : "<b>{point.name}</b>",
      allowOverlap: false,
      style: {
        color: textColor,
        fontSize: "11px",
        fontWeight: "500",
        textOutline: "none",
      },
      connectorColor: mutedColor,
    },
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "variablepie",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      animation: { duration: 500 },
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

    tooltip: {
      useHTML: true,
      headerFormat: "",
      pointFormat:
        `<span style="color:{point.color}">●</span> <b>{point.name}</b><br/>` +
        `${yLabel}: <b>{point.y}</b><br/>` +
        `${zLabel}: <b>{point.z}</b><br/>`,
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
      enabled: false,
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      itemStyle: { color: textColor, fontWeight: "500", fontSize: "12px" },
      itemHoverStyle: {
        color: isDark ? "rgba(249,115,22,0.9)" : "rgba(233,113,36,0.9)",
      },
    },

    plotOptions: {
      variablepie: {
        showInLegend: false,
        cursor: "pointer",
        states: {
          hover: {
            brightness: isDark ? 0.15 : -0.1,
          },
        },
      },
    },

    series: hcSeries,
    credits: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default React.memo(PieChart);