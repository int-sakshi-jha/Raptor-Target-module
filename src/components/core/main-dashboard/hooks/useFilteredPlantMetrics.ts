import { useMemo } from "react";
import type { MainDashboardFilters, PlantDashboardMetrics } from "../types/dashboard.types";
import { useMainDashboardStore } from "../store/mainDashboardStore";

function matchesSearch(plant: PlantDashboardMetrics, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return plant.plantName.toLowerCase().includes(q);
}

function matchesStatus(
  plant: PlantDashboardMetrics,
  statusFilters: MainDashboardFilters["status"],
): boolean {
  if (!statusFilters.length) return true;
  return statusFilters.includes(plant.status);
}

function matchesCapacity(plant: PlantDashboardMetrics, filters: MainDashboardFilters): boolean {
  const dc = plant.dcCapacityKw;
  if (dc == null) return true;
  return dc >= filters.capacityMinKw && dc <= filters.capacityMaxKw;
}

function matchesPlantSelection(
  plant: PlantDashboardMetrics,
  selectedPlantIds: string[],
): boolean {
  if (!selectedPlantIds.length) return true;
  return selectedPlantIds.includes(plant.plantId);
}

export function useFilteredPlantMetrics(plantMetrics: PlantDashboardMetrics[]) {
  const filters = useMainDashboardStore((s) => s.filters);

  return useMemo(() => {
    return plantMetrics.filter(
      (plant) =>
        matchesSearch(plant, filters.search) &&
        matchesStatus(plant, filters.status) &&
        matchesCapacity(plant, filters) &&
        matchesPlantSelection(plant, filters.selectedPlantIds),
    );
  }, [plantMetrics, filters]);
}

export function usePlantCapacityBounds(plantMetrics: PlantDashboardMetrics[]) {
  return useMemo(() => {
    const values = plantMetrics
      .map((p) => p.dcCapacityKw)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (!values.length) return { min: 0, max: 100_000 };
    return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
  }, [plantMetrics]);
}
