import { KpiCardsWidget } from "@/components/core/main-dashboard/widgets/kpi-cards/KpiCardsWidget";
import { PlantCardsWidget } from "@/components/core/main-dashboard/widgets/plant-cards/PlantCardsWidget";
import { EMPTY_KPI_METRICS } from "@/components/core/main-dashboard/constants/emptyKpiMetrics";
import { useMainDashboardData } from "@/components/core/main-dashboard/hooks/useMainDashboardData";

export function MainDashboardView() {
  const { kpis, plantMetrics, isLoading, isLive } = useMainDashboardData();

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col gap-2 p-2">
      <div className="shrink-0">
        <KpiCardsWidget
          kpis={isLoading ? EMPTY_KPI_METRICS : kpis}
          loading={isLoading}
          isLive={isLive}
        />
      </div>

      <PlantCardsWidget plantMetrics={plantMetrics} loading={isLoading} />
    </div>
  );
}

export { KpiCardsWidget };
export { useMainDashboardData } from "./hooks/useMainDashboardData";
export { useMainDashboardStore } from "./store/mainDashboardStore";
