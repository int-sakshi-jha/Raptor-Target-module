import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { usePlantComponents } from "@/hooks/usePlantComponents";
import { usePlantLiveData } from "@/hooks/usePlantLiveData";
import { buildPlantPerformanceSummary } from "../shared/plantPerformanceMetrics";
import { PlantDashboardCard } from "../shared/PlantDashboardCard";
import { PlantDashboardField } from "../shared/PlantDashboardField";
import { PlantDashboardMetricPanel } from "../shared/PlantDashboardMetricPanel";
import {
  PLANT_DASHBOARD_INSET_PANEL,
  PLANT_DASHBOARD_SECTION_DIVIDER,
} from "../shared/plantDashboardTheme";

interface EarningsBreakdownWidgetProps {
  plantId?: string;
  embedded?: boolean;
}

function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function EarningsBreakdownWidget({
  plantId,
  embedded = false,
}: EarningsBreakdownWidgetProps) {
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

  const progress =
    summary.earningsTodayInr != null &&
    summary.maxEarningsPossibleInr != null &&
    summary.maxEarningsPossibleInr > 0
      ? Math.max(0, Math.min(100, (summary.earningsTodayInr / summary.maxEarningsPossibleInr) * 100))
      : null;

  const hasPpaRate = (plantComponents.plant?.ppa_rate ?? 0) > 0;

  return (
    <PlantDashboardCard
      icon={TrendingUp}
      title="Earnings Breakdown"
      embedded={embedded}
      fillHeight
      compact
      className="h-full min-h-0"
    >
      <PlantDashboardMetricPanel>
        <div className={`grid grid-cols-2 gap-2 rounded-sm p-2 ${PLANT_DASHBOARD_INSET_PANEL}`}>
          <PlantDashboardField
            label="Earnings Today"
            value={hasPpaRate ? formatCurrency(summary.earningsTodayInr) : "-"}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <PlantDashboardField
            label="Max Earnings Possible"
            value={hasPpaRate ? formatCurrency(summary.maxEarningsPossibleInr) : "-"}
          />
        </div>

        <div className={`space-y-1 ${PLANT_DASHBOARD_SECTION_DIVIDER} pt-1.5`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-dark-300/50">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          {!hasPpaRate ? (
            <p className="text-[9px] text-neutral-400 dark:text-neutral-dark-500">
              Set plant PPA rate to calculate earnings.
            </p>
          ) : null}
        </div>
      </PlantDashboardMetricPanel>
    </PlantDashboardCard>
  );
}
