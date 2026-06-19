import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import ChartCard from "@/components/core/charts/ChartCard";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildGenerationCurve } from "../generation-graph/generationGraph";
import { buildPlantPerformanceSummary } from "../shared/plantPerformanceMetrics";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";

interface GenerationAnalyticsWidgetProps {
  plantId?: string;
  title?: string;
  embedded?: boolean;
}

function formatMetric(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

export function GenerationAnalyticsWidget({
  plantId,
  title = "Generation Analytics",
  embedded = false,
}: GenerationAnalyticsWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });

  const curve = useMemo(
    () =>
      buildGenerationCurve({
        plantLive: live.plantLive,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }),
    [live.componentById, live.plantLive, live.processedByComponentId],
  );

  const summary = useMemo(
    () =>
      buildPlantPerformanceSummary({
        plant: plantComponents.plant,
        plantLive: live.plantLive,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }),
    [
      live.componentById,
      live.plantLive,
      live.processedByComponentId,
      plantComponents.plant,
    ],
  );

  const categories = useMemo(() => curve.map((point) => point.label), [curve]);
  const series = useMemo(
    () => [
      {
        name: "Active Power",
        data: curve.map((point) => ({ name: point.label, value: point.valueKw ?? 0 })),
      },
    ],
    [curve],
  );

  const metrics = [
    { label: "Energy Yield", value: formatMetric(summary.energyYield, " kWh/kWp") },
    { label: "Performance Ratio", value: formatMetric(summary.performanceRatio, "%") },
    { label: "DC CUF", value: formatMetric(summary.dcCuf, "%") },
  ];

  const hasData = curve.some((point) => point.valueKw != null && point.valueKw > 0);

  return (
    <PlantDashboardCard
      icon={BarChart3}
      title={title}
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xs border border-neutral-200/80 bg-neutral-50/80 px-2 py-1.5 text-center dark:border-neutral-dark-300/60 dark:bg-neutral-dark-200/30"
            >
              <p className="text-[9px] text-neutral-500">{metric.label}</p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {hasData ? (
          <div className="min-h-0 flex-1 [&_.glass-morphism-card]:flex [&_.glass-morphism-card]:h-full [&_.glass-morphism-card]:min-h-0 [&_.glass-morphism-card]:flex-1 [&_.glass-morphism-card]:flex-col [&_.glass-morphism-card]:rounded-none [&_.glass-morphism-card]:border-0 [&_.glass-morphism-card]:bg-transparent [&_.glass-morphism-card]:shadow-none [&_.highcharts-container]:!h-full [&_.highcharts-container]:min-h-[120px]">
            <ChartCard
              title="Generation"
              storageKey={`plant-dashboard-generation-analytics-${plantId ?? "plant"}`}
              allowedChartTypes={["area", "line"]}
              defaultChartType="area"
              categories={categories}
              series={series}
              yAxisTitle="Active Power"
              yAxisSuffix=" kW"
              tooltipSuffix=" kW"
              xAxisTitle="Time of Day"
              areaFillOpacity={0.25}
              barShowLegend={false}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[11px] text-neutral-500">
            No generation data available yet.
          </div>
        )}
      </div>
    </PlantDashboardCard>
  );
}
