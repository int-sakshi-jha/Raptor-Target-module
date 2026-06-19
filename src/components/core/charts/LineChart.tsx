import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

export type LineSeries = {
  name: string;
  data: (number | Highcharts.PointOptionsObject)[];
  marker?: Highcharts.PointMarkerOptionsObject;
};

type LineChartProps = {
  title?: string;
  subtitle?: string;
  categories: string[];
  yAxisTitle?: string;
  yAxisSuffix?: string;
  series: LineSeries[];
  isDark?: boolean;
};
const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const LineChart: React.FC<LineChartProps> = ({
  title,
  subtitle,
  categories,
  yAxisTitle,
  yAxisSuffix = "",
  series,
  isDark = false,
}) => {
  const textColor      = isDark ? "#f5f5f5" : "#171717";
  const mutedColor     = isDark ? "#a3a3a3" : "#737373";
  const gridColor      = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const crosshairColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const tooltipBg     = isDark ? "rgba(0,0,0,0.75)"         : "rgba(255,255,255,0.82)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.12)"   : "rgba(0,0,0,0.10)";
  const primaryColor  = isDark ? "rgba(249,115,22,0.9)"     : "rgba(233,113,36,0.9)";
  
  const chartRef = React.useRef<HighchartsReact.RefObject>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const options: Highcharts.Options = {
    chart: {
      type: "spline",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      animation: { duration: 400 },
      zooming: { type: "x" },      panning: { enabled: true, type: "x" },
      panKey: "shift",
    },

    title: {
      text: title,
      style: { color: textColor, fontSize: "14px", fontWeight: "600" },
    },

    subtitle: {
      text: subtitle,
      useHTML: true,
      style: { color: mutedColor, fontSize:isMobile ? "8px" : "11px" },
    },

    xAxis: {
      categories,
      crosshair: { color: crosshairColor, width: 1, dashStyle: "Dash" },
      labels: { style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" } },
      lineColor: gridColor,
      tickColor: gridColor,
      accessibility: { description: "X axis categories" },
    },

    yAxis: {
      title: {
        text: yAxisTitle,
        style: { color: mutedColor, fontSize:isMobile ? "7px" : "11px" },
      },
      labels: {
        format: `{value}${yAxisSuffix}`,
        style: { color: mutedColor, fontSize: isMobile ? "7px" : "12px" },
      },
      gridLineColor: gridColor,
      gridLineDashStyle: "ShortDash",
    },

    tooltip: {
      shared: true,
      valueSuffix: yAxisSuffix,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 12,
      style: { color: textColor, fontSize:isMobile ? "9px" : "12px" },
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
        fontSize:isMobile ? "10px" : "12px",
      },
      itemHoverStyle: { color: primaryColor },
    },

    plotOptions: {
      spline: {
        marker: {
          enabled: true,
          radius: 4,
          lineColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.22)",
          lineWidth: 1.5,
        },
      },
    },

    series: series as Highcharts.SeriesOptionsType[],

    credits: { enabled: false },
  };

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

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        ref={chartRef}
      />
    </div>
  );
};

export default React.memo(LineChart);