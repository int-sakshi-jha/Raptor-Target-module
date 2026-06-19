import { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import ChartCard, { type ChartSeries, type ChartType } from "@/components/core/charts/ChartCard";
import Tabs from "@/components/common/Tabs";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";
import {
  COMPARE_METRIC_OPTIONS,
  getCompareMetricLabel,
  getCompareMetricUnit,
  getCompareMetricValue,
} from "@/components/core/main-dashboard/utils/plantMetricUtils";

const initMore = HighchartsMore as unknown as
  | ((hc: typeof Highcharts) => void)
  | { default: (hc: typeof Highcharts) => void };
if (typeof initMore === "function") initMore(Highcharts);
else if (initMore?.default) initMore.default(Highcharts);

const ALL_CHART_TYPES: ChartType[] = [
  "line",
  "area",
  "bar",
  "pie",
  "radar",
  "bubble",
  "gauge",
];

interface ChartsViewProps {
  plants: PlantDashboardMetrics[];
}

export function ChartsView({ plants }: ChartsViewProps) {
  const compareBy = useMainDashboardStore((s) => s.filters.compareBy);
  const setFilters = useMainDashboardStore((s) => s.setFilters);

  const { categories, series, unit, gaugeValue } = useMemo(() => {
    const sorted = [...plants].sort((a, b) => {
      const av = getCompareMetricValue(a, compareBy) ?? -Infinity;
      const bv = getCompareMetricValue(b, compareBy) ?? -Infinity;
      return bv - av;
    });

    const cats = sorted.map((plant) =>
      plant.plantName.length > 18 ? `${plant.plantName.slice(0, 16)}…` : plant.plantName,
    );

    const values = sorted.map((plant) => getCompareMetricValue(plant, compareBy) ?? 0);
    const avg =
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

    const chartSeries: ChartSeries[] = [
      {
        name: getCompareMetricLabel(compareBy),
        data: sorted.map((plant, i) => ({
          name: cats[i]!,
          value: getCompareMetricValue(plant, compareBy) ?? 0,
          size: getCompareMetricValue(plant, compareBy) ?? 0,
        })),
      },
    ];

    return {
      categories: cats,
      series: chartSeries,
      unit: getCompareMetricUnit(compareBy),
      gaugeValue: avg,
    };
  }, [plants, compareBy]);

  const compareTabs = COMPARE_METRIC_OPTIONS.map((o) => ({
    key: o.value,
    label: o.label,
  }));

  if (!plants.length) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-sm border border-dashed border-neutral-300/80 p-8 text-center text-sm text-neutral-500 dark:border-neutral-dark-400/60">
          No plants available for comparison.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2">
      <div className="shrink-0 overflow-x-auto pb-1">
        <Tabs
          tabs={compareTabs}
          selected={compareBy}
          onChange={(key) => setFilters({ compareBy: key as typeof compareBy })}
          size="sm"
        />
      </div>

      <div className="min-h-[min(100%,480px)] w-full flex-1">
        <ChartCard
          title={`Plant Comparison — ${getCompareMetricLabel(compareBy)}`}
          subtitle={`Comparing ${plants.length} plants · use chart selector for type`}
          allowedChartTypes={ALL_CHART_TYPES}
          defaultChartType="bar"
          storageKey={`main-dashboard-compare-${compareBy}`}
          categories={categories}
          series={series}
          yAxisTitle={getCompareMetricLabel(compareBy)}
          yAxisSuffix={unit ? ` ${unit}` : ""}
          tooltipSuffix={unit ? ` ${unit}` : ""}
          gaugeValue={gaugeValue}
          gaugeName={getCompareMetricLabel(compareBy)}
          gaugeValueSuffix={unit ? ` ${unit}` : ""}
          barShowDataLabels
          barShowLegend={false}
          bubbleXAxisMin={0}
          bubbleYAxisMin={0}
        />
      </div>
    </div>
  );
}
