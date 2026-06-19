import { TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPlantPerformanceSummary } from "../shared/plantPerformanceMetrics";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardMetricBar } from "../shared/PlantDashboardMetricBar";
import { PlantDashboardMetricPanel } from "../shared/PlantDashboardMetricPanel";

interface LowPerformingComponentsWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function LowPerformingComponentsWidget({
  plantId,
  embedded = false,
}: LowPerformingComponentsWidgetProps) {
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

  const maxCount = Math.max(
    summary.lowPerforming.dcChannels,
    summary.lowPerforming.inverters,
    summary.lowPerforming.blocks,
    1,
  );

  const items = [
    { label: "DC Channels", count: summary.lowPerforming.dcChannels },
    { label: "Inverter", count: summary.lowPerforming.inverters },
    { label: "Blocks", count: summary.lowPerforming.blocks },
  ];

  return (
    <PlantDashboardCard
      icon={TrendingDown}
      title="Low Performing Components"
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
            value={formatCount(item.count)}
            percent={(item.count / maxCount) * 100}
            tone={item.count > 0 ? "warning" : "success"}
          />
        ))}
      </PlantDashboardMetricPanel>
    </PlantDashboardCard>
  );
}
