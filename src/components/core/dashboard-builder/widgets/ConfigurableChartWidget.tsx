import { useMemo } from "react";
import { BarChart3, LineChart } from "lucide-react";
import ChartCard from "@/components/core/charts/ChartCard";
import { buildGenerationCurve } from "@/components/core/plant-dashboard/generation-graph/generationGraph";
import { buildProcessedRows } from "@/components/core/plant-dashboard/shared/plantLiveMetrics";
import { resolveRowTodayGenerationKwh } from "@/components/core/plant-dashboard/shared/plantLiveMetrics";
import type { WidgetRenderProps } from "../registry/widgetLibrary";
import type { WidgetLibraryType } from "../types/document";
import { buildTagGroupBarSeries } from "../core/tagGroupRuntime";
import { widgetShowHeading } from "../core/tagTemplateRuntime";
import { useTagTemplateWidgetData } from "../hooks/useTagTemplateWidgetData";
import { DashboardWidgetShell } from "./shared/DashboardWidgetShell";

type ChartWidgetType = Extract<WidgetLibraryType, "line_chart" | "area_chart" | "bar_chart">;

interface ConfigurableChartWidgetProps extends WidgetRenderProps {
  chartType: ChartWidgetType;
}

function chartMeta(chartType: ChartWidgetType) {
  if (chartType === "bar_chart") {
    return { icon: BarChart3, defaultTitle: "Bar Chart", allowed: ["bar"] as const, defaultType: "bar" as const };
  }
  if (chartType === "area_chart") {
    return { icon: LineChart, defaultTitle: "Area Chart", allowed: ["area", "line"] as const, defaultType: "area" as const };
  }
  return { icon: LineChart, defaultTitle: "Line Chart", allowed: ["line", "area"] as const, defaultType: "line" as const };
}

export function ConfigurableChartWidget({
  plantId,
  title,
  config,
  chartType,
  editMode,
}: ConfigurableChartWidgetProps) {
  const meta = chartMeta(chartType);
  const showHeading = widgetShowHeading(config);
  const { live, tagConfig, resolvedTagKeys, hasTagTemplate, isTagTemplateLoading } =
    useTagTemplateWidgetData({
      plantId,
      tagTemplateId: config.tagTemplateId,
      tagKeys: config.tagKeys,
    });

  const chartData = useMemo(() => {
    if (hasTagTemplate && resolvedTagKeys.length > 0 && tagConfig.length > 0) {
      return buildTagGroupBarSeries({
        tagConfig,
        tagKeys: resolvedTagKeys,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
        seriesName: String(config.seriesName ?? resolvedTagKeys[0]),
      });
    }

    if (chartType === "bar_chart") {
      const rows = buildProcessedRows({
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }).filter((row) => row.componentGroup === "inverter");

      return {
        categories: rows.map(
          (row) => row.component?.component_name ?? row.component?.component_code ?? row.componentId,
        ),
        series: [
          {
            name: "Today Generation",
            data: rows.map((row) => ({
              name:
                row.component?.component_name ?? row.component?.component_code ?? row.componentId,
              value: resolveRowTodayGenerationKwh(row) ?? 0,
            })),
          },
        ],
      };
    }

    const curve = buildGenerationCurve({
      plantLive: live.plantLive,
      processedByComponentId: live.processedByComponentId,
      componentById: live.componentById,
    });

    return {
      categories: curve.map((point) => point.label),
      series: [
        {
          name: String(config.seriesName ?? "Active Power"),
          data: curve.map((point) => ({
            name: point.label,
            value: point.valueKw ?? 0,
          })),
        },
      ],
    };
  }, [
    chartType,
    config.seriesName,
    hasTagTemplate,
    live.componentById,
    live.plantLive,
    live.processedByComponentId,
    resolvedTagKeys,
    tagConfig,
  ]);

  const hasData = chartData.series.some((series) =>
    series.data.some((point) => Number.isFinite(point.value) && point.value !== 0),
  );

  const chartTitle = String(title ?? config.title ?? meta.defaultTitle);
  const ySuffix = String(config.yAxisSuffix ?? (chartType === "bar_chart" ? " kWh" : " kW"));

  return (
    <DashboardWidgetShell
      icon={meta.icon}
      title={chartTitle}
      showHeading={showHeading}
      description={
        hasTagTemplate
          ? "Live values from the selected tag template tag map."
          : chartType === "bar_chart"
            ? "Inverter generation comparison for today."
            : "Intraday active power curve."
      }
      embedded
      fillHeight
      className={editMode ? "pointer-events-none select-none" : undefined}
    >
      {isTagTemplateLoading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-neutral-500">
          Loading tag template…
        </div>
      ) : !hasData ? (
        <div className="flex flex-1 items-center justify-center text-center text-xs text-neutral-500 dark:text-neutral-dark-600">
          No chart data available yet. Configure a tag template or wait for live data.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col [&_.glass-morphism-card]:flex [&_.glass-morphism-card]:h-full [&_.glass-morphism-card]:min-h-0 [&_.glass-morphism-card]:flex-1 [&_.glass-morphism-card]:flex-col [&_.glass-morphism-card]:rounded-none [&_.glass-morphism-card]:border-0 [&_.glass-morphism-card]:bg-transparent [&_.glass-morphism-card]:shadow-none [&_.highcharts-container]:!h-full [&_.highcharts-container]:min-h-[140px]">
          <ChartCard
            title={showHeading ? "" : chartTitle}
            storageKey={`dashboard-${chartType}-${plantId ?? "plant"}-${String(config.tagTemplateId ?? "default")}`}
            allowedChartTypes={[...meta.allowed]}
            defaultChartType={meta.defaultType}
            categories={chartData.categories}
            series={chartData.series}
            yAxisTitle={String(config.yAxisTitle ?? meta.defaultTitle)}
            yAxisSuffix={ySuffix}
            tooltipSuffix={ySuffix}
            xAxisTitle={String(config.xAxisTitle ?? (chartType === "bar_chart" ? "Component" : "Time of Day"))}
            areaFillOpacity={chartType === "area_chart" ? 0.28 : undefined}
            barShowLegend={false}
          />
        </div>
      )}
    </DashboardWidgetShell>
  );
}
