import { Activity } from "lucide-react";
import { useMemo } from "react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPlantPerformanceSummary } from "../shared/plantPerformanceMetrics";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardMetricBar, toneForMetric } from "../shared/PlantDashboardMetricBar";
import { PlantDashboardMetricPanel } from "../shared/PlantDashboardMetricPanel";

interface PerformanceIndicatorWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function formatMetric(value: number | null, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}${unit}`;
}

export function PerformanceIndicatorWidget({
  plantId,
  embedded = false,
}: PerformanceIndicatorWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });

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

  const items = [
    {
      label: "Energy Yield",
      value: formatMetric(summary.energyYield, " kWh/kWp"),
      percent: summary.energyYield != null ? Math.min(100, summary.energyYield * 10) : null,
    },
    {
      label: "PR",
      value: formatMetric(summary.performanceRatio, "%"),
      percent: summary.performanceRatio,
    },
    {
      label: "DC CUF",
      value: formatMetric(summary.dcCuf, "%"),
      percent: summary.dcCuf,
    },
    {
      label: "AC CUF",
      value: formatMetric(summary.acCuf, "%"),
      percent: summary.acCuf,
    },
  ];

  return (
    <PlantDashboardCard
      icon={Activity}
      title="Performance Indicator"
      embedded={embedded}
      fillHeight
      compact
      className="h-full min-h-0"
    >
      <PlantDashboardMetricPanel>
        {items.map((item) => (
          <PlantDashboardMetricBar
            key={item.label}
            label={item.label}
            value={item.value}
            percent={item.percent}
            tone={toneForMetric(item.label, item.percent)}
          />
        ))}
      </PlantDashboardMetricPanel>
    </PlantDashboardCard>
  );
}
