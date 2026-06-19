// src/components/core/charts/BarChart.tsx
import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/accessibility";

export type BarSeriesData = number | null;

export type BarSeries = {
  name: string;
  data: BarSeriesData[];
  color?: string;
};

type BarChartProps = {
  title?: string;
  subtitle?: string;
  categories: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  yAxisTitleAlign?: "low" | "middle" | "high";
  tooltipSuffix?: string;
  showDataLabels?: boolean;
  borderRadius?: string;
  showLegend?: boolean;
  series: BarSeries[];
  isDark?: boolean;
};

// ── Theme-aware colour palettes ───────────────────────────────────────────────
const COLORS_LIGHT = [
  "#e97124", 
  "#c45e1a", 
  "#f59346", 
  "#a84d10", 
  "#fbb174",
  "#7a3a0a",
  "#fdd0a8", 
  "#d4622b",
];

const COLORS_DARK = [
  "#f97316", 
  "#fb923c",
  "#fdba74", 
  "#ea6c0a",
  "#fcd4a0",
  "#c2601a",
  "#ff6b00",
  "#e8490a",
];

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const BarChart: React.FC<BarChartProps> = ({
  title,
  subtitle,
  categories,
  xAxisTitle,
  yAxisTitle = "",
  yAxisTitleAlign = "high",
  tooltipSuffix = "",
  showDataLabels = true,
  borderRadius = "4px",
  showLegend = true,
  series,
  isDark = false,
}) => {
  // ── Refs for wheel zoom ───────────────────────────────────────────────────
  const chartRef     = React.useRef<HighchartsReact.RefObject>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const palette        = isDark ? COLORS_DARK : COLORS_LIGHT;
  const textColor      = isDark ? "#fafafa"                 : "#171717"; 
  const mutedColor     = isDark ? "#a3a3a3"                 : "#737373";
  const gridColor      = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.07)";
  const tooltipBg      = isDark ? "rgba(28,28,30,0.92)"     : "rgba(255,255,255,0.92)";
  const tooltipBorder  = isDark ? "rgba(255,255,255,0.12)"  : "rgba(0,0,0,0.10)";       
  const legendBg       = isDark ? "rgba(38,38,42,0.85)"     : "rgba(255,255,255,0.80)"; 
  const legendBorder   = isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.08)";   

  const hcSeries: Highcharts.SeriesOptionsType[] = series.map((s, idx) => ({
    type: "column" as const,
    name: s.name,
    data: s.data,
    // Per-series color → falls back to palette slot
    color: s.color ?? palette[idx % palette.length],
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "column",
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

    xAxis: {
      categories,
      title: {
        text: xAxisTitle ?? null,
        style: { color: mutedColor, fontSize:isMobile? "7px" : "11px" },
      },
      gridLineWidth: 1,
      gridLineColor: gridColor,
      gridLineDashStyle: "ShortDash",
      lineWidth: 0,
      tickColor: "transparent",
      labels: { style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" } },
    },

    yAxis: {
      min: 0,
      title: {
        text: yAxisTitle,
        align: yAxisTitleAlign,
        style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" },
      },
      labels: {
        overflow: "justify",
        style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" },
      },
      gridLineWidth: 0,
    },

    tooltip: {
      valueSuffix: tooltipSuffix,
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

    plotOptions: {
      column: {
        borderRadius,
        borderWidth: 0,
        dataLabels: {
          enabled: showDataLabels,
          style: {
            color: textColor,
            fontSize:isMobile? "6px" :"11px",
            fontWeight: "500",
            textOutline: "none",
          },
        },
        groupPadding: 0.1,
        states: {
          hover: {
            brightness: isDark ? 0.15 : -0.08,
          },
          select: {
            color: isDark
              ? "rgba(249,115,22,0.6)"
              : "rgba(233,113,36,0.6)",
          },
        },
      },
    },

    legend: {
      enabled: showLegend,
      layout: "vertical",
      align: "right",
      verticalAlign: "top",
      x: -40,
      y: 80,
      floating: true,
      borderWidth: 1,
      borderColor: legendBorder,
      borderRadius: 8,
      backgroundColor: legendBg,
      shadow: false,
      itemStyle: {
        color: textColor,
        fontWeight: "500",
        fontSize: "12px",
      },
      itemHoverStyle: {
        color: isDark ? "#f97316" : "#e97124",
      },
    },

    series: hcSeries,
    credits: { enabled: false },
  };

  // ── Wheel zoom on X axis (mirrors LineChart pattern) ─────────────────────
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
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY > 0 ? 0.8 : 1.2;

      const currentRange = max - min;
      const newRange = currentRange * zoomFactor;

      const totalRange = dataMax - dataMin;

      const minRange = totalRange * 0.01;
      const maxRange = totalRange;

      const limitedRange = Math.max(minRange, Math.min(maxRange, newRange));

      const center = (max + min) / 2;

      let newMin = center - limitedRange / 2;
      let newMax = center + limitedRange / 2;

      newMin = Math.max(dataMin, newMin);
      newMax = Math.min(dataMax, newMax);

      xAxis.setExtremes(newMin, newMax);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ overflow: "hidden", touchAction: "none" }}
    >
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        ref={chartRef}
      />
    </div>
  );
};

export default React.memo(BarChart);