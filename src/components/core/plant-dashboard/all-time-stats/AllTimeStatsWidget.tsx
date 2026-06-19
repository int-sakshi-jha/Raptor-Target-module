import { IndianRupee } from "lucide-react";
import { useMemo } from "react";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { buildAllTimeStatsSummary } from "./allTimeStats";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardMetricTile } from "../shared/PlantDashboardMetricTile";

interface AllTimeStatsWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function formatCurrencyInr(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(digits, 2),
  }).format(value);
}

export function AllTimeStatsWidget({ plantId, embedded = false }: AllTimeStatsWidgetProps) {
  const live = usePlantLiveData({ plantId });
  const plantComponents = usePlantComponents({ plantId });

  const stats = useMemo(
    () =>
      buildAllTimeStatsSummary({
        plant: plantComponents.plant,
        processedByComponentId: live.processedByComponentId,
        componentById: live.componentById,
      }),
    [live.componentById, live.processedByComponentId, plantComponents.plant],
  );

  const items = [
    {
      label: "Total Revenue",
      value: formatCurrencyInr(stats.totalRevenueInr),
      accent: "brand" as const,
    },
    {
      label: "Total Export",
      value: formatCompactNumber(stats.totalExportMwh),
      unit: "MWh",
      accent: "blue" as const,
    },
    {
      label: "Total Consumption",
      value: formatCompactNumber(stats.totalConsumptionMwh),
      unit: "MWh",
      accent: "amber" as const,
    },
  ];

  return (
    <PlantDashboardCard
      icon={IndianRupee}
      title="All Time Stats"
      embedded={embedded}
      fillHeight={embedded}
      className={embedded ? "h-full" : undefined}
    >
      <div className="grid h-full auto-rows-fr grid-cols-1 gap-2">
        {items.map((item) => (
          <PlantDashboardMetricTile
            key={item.label}
            label={item.label}
            value={item.value}
            unit={item.unit}
            accent={item.accent}
            layout="row"
            className="h-full w-full"
          />
        ))}
      </div>
    </PlantDashboardCard>
  );
}
