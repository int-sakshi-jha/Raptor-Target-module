import { useMemo } from "react";
import { calculateRevenue } from "../calculations/calculateRevenue";
import type { PlantDashboardMetrics } from "../types/dashboard.types";
import { useMainDashboardStore } from "../store/mainDashboardStore";
import { useFilteredPlantMetrics } from "./useFilteredPlantMetrics";

export function useDisplayPlantMetrics(plantMetrics: PlantDashboardMetrics[]) {
  const filtered = useFilteredPlantMetrics(plantMetrics);
  const revenueType = useMainDashboardStore((s) => s.filters.revenueType);

  return useMemo(
    () =>
      filtered.map((plant) => {
        const revenue = calculateRevenue({
          revenueType,
          exportEnergyKwh: plant.exportEnergyKwh ?? plant.exportPowerKw,
          importEnergyKwh: plant.importEnergyKwh ?? plant.importPowerKw,
          todayGenerationKwh: plant.todayGenerationKwh,
          ppaRate: plant.ppaRate,
        });
        return { ...plant, revenue, revenueType };
      }),
    [filtered, revenueType],
  );
}
