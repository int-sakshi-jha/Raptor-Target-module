import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Accessibility from "highcharts/modules/accessibility";
if (typeof Accessibility === "function") {
  Accessibility(Highcharts);
}
import HighchartsMore from "highcharts/highcharts-more";

if (typeof HighchartsMore === "function") {
//   HighchartsMore(Highcharts);
}

export type BubblePoint = [number, number, number] | {
  x: number;
  y: number;
  z: number;
  name?: string;
};

export type BubbleSeries = {
  name?: string;
  data: BubblePoint[];
  color?: string;
  opacity?: number;
};

type BubblesChartProps = {
  title?: string;
  subtitle?: string;
  xAxisTitle?: string;
  xAxisMin?: number;
  xAxisMax?: number;
  yAxisTitle?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  maxSize?: string;
  minSize?: number;
  series: BubbleSeries[];
  isDark?: boolean;
  zoomable?: boolean;
  showPlotBorder?: boolean;
};

const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

const BubblesChart: React.FC<BubblesChartProps> = ({
  title,
  subtitle,
  xAxisTitle,
  xAxisMin,
  xAxisMax,
  yAxisTitle,
  yAxisMin,
  yAxisMax,
  maxSize = "15%",
  minSize = 8,
  series,
  isDark = false,
  zoomable = true,
  showPlotBorder = true,
}) => {
  const chartRef      = React.useRef<HighchartsReact.RefObject>(null);
  const containerRef  = React.useRef<HTMLDivElement>(null);

  const textColor      = isDark ? "#f5f5f5"                  : "#171717";
  const mutedColor     = isDark ? "#a3a3a3"                  : "#737373";
  const gridColor      = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const borderColor    = isDark ? "rgba(255,255,255,0.10)"   : "rgba(0,0,0,0.08)";
  const tooltipBg      = isDark ? "rgba(0,0,0,0.75)"         : "rgba(255,255,255,0.82)";
  const tooltipBorder  = isDark ? "rgba(255,255,255,0.12)"   : "rgba(0,0,0,0.10)";

  const hcSeries: Highcharts.SeriesOptionsType[] = series.map((s, idx) => {
    const baseColor = s.color ?? Highcharts.getOptions().colors?.[idx] ?? "#E97124";
    const opacity   = s.opacity ?? 1;

    const outerStop =
      opacity < 1
        ? Highcharts.color(baseColor).setOpacity(opacity).get("rgba") as string
        : baseColor;

    return {
      type: "bubble" as const,
      name: s.name ?? `Series ${idx + 1}`,
      data: s.data,
      maxSize,
      minSize,
      marker: {
        fillColor: {
          radialGradient: { cx: 0.4, cy: 0.3, r: 0.7 },
          stops: [
            [0, isDark ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.90)"],
            [1, outerStop],
          ] as Highcharts.GradientColorObject["stops"],
        },
      },
    };
  });

  const options: Highcharts.Options = {
    chart: {
      type: "bubble",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      plotBorderWidth: showPlotBorder ? 1 : 0,
      plotBorderColor: borderColor,
      animation: { duration: 500 },
      zooming: zoomable ? { type: "xy" } : undefined,
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
      title: {
        text: xAxisTitle,
        style: { color: mutedColor, fontSize:isMobile ? "7px" : "11px" },
      },
      min: xAxisMin,
      max: xAxisMax,
      gridLineWidth: 1,
      gridLineColor: gridColor,
      gridLineDashStyle: "ShortDash",
      lineColor: gridColor,
      tickColor: gridColor,
      labels: { style: { color: mutedColor, fontSize: isMobile ? "7px" : "11px" } },
      crosshair: {
        color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
        width: 1,
        dashStyle: "Dash",
      },
      accessibility: {
        rangeDescription:
          xAxisMin != null && xAxisMax != null
            ? `Range: ${xAxisMin} to ${xAxisMax}.`
            : undefined,
      },
    },

    yAxis: {
      title: {
        text: yAxisTitle,
        style: { color: mutedColor, fontSize:isMobile? "7px" : "11px" },
      },
      min: yAxisMin,
      max: yAxisMax,
      startOnTick: false,
      endOnTick: false,
      gridLineColor: gridColor,
      gridLineDashStyle: "ShortDash",
      labels: { style: { color: mutedColor, fontSize:isMobile? "7px" : "11px" } },
      accessibility: {
        rangeDescription:
          yAxisMin != null && yAxisMax != null
            ? `Range: ${yAxisMin} to ${yAxisMax}.`
            : undefined,
      },
    },

    tooltip: {
      useHTML: true,
      headerFormat: "<small style='color:{series.color}'>{series.name}</small><br>",
      pointFormat:
        "<b>X:</b> {point.x}<br/><b>Y:</b> {point.y}<br/><b>Size:</b> {point.z}",
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
      itemStyle: { color: textColor, fontWeight: "500", fontSize: "12px" },
      itemHoverStyle: {
        color: isDark ? "rgba(249,115,22,0.9)" : "rgba(233,113,36,0.9)",
      },
    },

    series: hcSeries,
    credits: { enabled: false },
  };

  // ── Wheel zoom: zooms both X and Y axes simultaneously ───────────────────
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!chartRef.current?.chart) return;

      const chart = chartRef.current.chart;
      const xAxis = chart.xAxis[0];
      const yAxis = chart.yAxis[0];

      const { min: xMin, max: xMax, dataMin: xDataMin, dataMax: xDataMax } = xAxis.getExtremes();
      const { min: yMin, max: yMax, dataMin: yDataMin, dataMax: yDataMax } = yAxis.getExtremes();

      if (
        xMin === undefined || xMax === undefined ||
        xDataMin === undefined || xDataMax === undefined ||
        yMin === undefined || yMax === undefined ||
        yDataMin === undefined || yDataMax === undefined
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY > 0 ? 0.8 : 1.2;

      // ── X axis ────────────────────────────────────────────────────────────
      const xTotalRange   = xDataMax - xDataMin;
      const xCurrentRange = xMax - xMin;
      const xNewRange     = Math.max(xTotalRange * 0.01, Math.min(xTotalRange, xCurrentRange * zoomFactor));
      const xCenter       = (xMax + xMin) / 2;
      const xNewMin       = Math.max(xDataMin, xCenter - xNewRange / 2);
      const xNewMax       = Math.min(xDataMax, xCenter + xNewRange / 2);

      // ── Y axis ────────────────────────────────────────────────────────────
      const yTotalRange   = yDataMax - yDataMin;
      const yCurrentRange = yMax - yMin;
      const yNewRange     = Math.max(yTotalRange * 0.01, Math.min(yTotalRange, yCurrentRange * zoomFactor));
      const yCenter       = (yMax + yMin) / 2;
      const yNewMin       = Math.max(yDataMin, yCenter - yNewRange / 2);
      const yNewMax       = Math.min(yDataMax, yCenter + yNewRange / 2);

      xAxis.setExtremes(xNewMin, xNewMax, false);
      yAxis.setExtremes(yNewMin, yNewMax, true);
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

export default React.memo(BubblesChart);