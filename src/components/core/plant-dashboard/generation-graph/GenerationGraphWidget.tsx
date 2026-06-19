import { LineChart } from "lucide-react";
import { useMemo } from "react";
import ChartCard from "@/components/core/charts/ChartCard";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildGenerationCurve } from "./generationGraph";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardEmptyState } from "../shared/PlantDashboardEmptyState";
import type { GenerationGraphWidgetConfig } from "../shared/dashboardTypes";

interface GenerationGraphWidgetProps {
  plantId?: string;
  title?: string;
  config?: GenerationGraphWidgetConfig;
  embedded?: boolean;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center rounded-xs border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
      Live
    </span>
  );
}

export function GenerationGraphWidget({
  plantId,
  title = "Generation Graph",
  config,
  embedded = false,
}: GenerationGraphWidgetProps) {
  const live = usePlantLiveData({ plantId });

  const curve = useMemo(
    () =>
      buildGenerationCurve({
        plantLive: live.plantLive,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
        options: {
          sourceGroups: config?.sourceGroups,
          dayStartHour: config?.dayStartHour,
          dayEndHour: config?.dayEndHour,
          slotMinutes: config?.slotMinutes,
        },
      }),
    [
      config?.dayEndHour,
      config?.dayStartHour,
      config?.slotMinutes,
      config?.sourceGroups,
      live.componentById,
      live.plantLive,
      live.processedByComponentId,
    ],
  );

  const categories = useMemo(() => curve.map((point) => point.label), [curve]);
  const series = useMemo(
    () => [
      {
        name: config?.seriesName ?? "Active Power",
        data: curve.map((point) => ({
          name: point.label,
          value: point.valueKw ?? 0,
        })),
      },
    ],
    [config?.seriesName, curve],
  );

  const hasData = curve.some((point) => point.valueKw != null && point.valueKw > 0);

  return (
    <PlantDashboardCard
      icon={LineChart}
      title={title}
      badge={<LiveBadge />}
      embedded={embedded}
      fillHeight
      className="h-full"
    >
      {hasData ? (
        <div className="flex min-h-0 flex-1 flex-col [&_.glass-morphism-card]:flex [&_.glass-morphism-card]:h-full [&_.glass-morphism-card]:min-h-0 [&_.glass-morphism-card]:flex-1 [&_.glass-morphism-card]:flex-col [&_.glass-morphism-card]:rounded-none [&_.glass-morphism-card]:border-0 [&_.glass-morphism-card]:bg-transparent [&_.glass-morphism-card]:shadow-none [&_.highcharts-container]:!h-full [&_.highcharts-container]:min-h-[140px] [&_div.border-b]:py-2 [&_div.sm\\:px-3]:!flex-1 [&_div.sm\\:px-3]:!py-2">
          <ChartCard
            title="Generation Graph"
            storageKey={`plant-dashboard-generation-${plantId ?? "plant"}`}
            allowedChartTypes={config?.allowedChartTypes ?? ["area", "line"]}
            defaultChartType={config?.chartType ?? "area"}
            categories={categories}
            series={series}
            yAxisTitle={config?.yAxisTitle ?? "Active Power"}
            yAxisSuffix={config?.yAxisSuffix ?? " kW"}
            tooltipSuffix={config?.tooltipSuffix ?? " kW"}
            xAxisTitle={config?.xAxisTitle ?? "Time of Day"}
            areaFillOpacity={0.28}
            barShowLegend={config?.showLegend ?? false}
          />
        </div>
      ) : (
        <PlantDashboardEmptyState
          message="No live generation curve available"
          description="Generation data will appear when inverters are producing power."
        />
      )}
    </PlantDashboardCard>
  );
}
