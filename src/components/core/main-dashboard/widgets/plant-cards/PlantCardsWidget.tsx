import { useMemo, useRef, useState } from "react";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useDisplayPlantMetrics } from "@/components/core/main-dashboard/hooks/useDisplayPlantMetrics";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";
import { usePlantCapacityBounds } from "@/components/core/main-dashboard/hooks/useFilteredPlantMetrics";
import CommonFilterPanel from "@/components/core/table/CommonFilterPanel";
import type { CommonTableHandle } from "@/components/core/table/CommonTable";
import {
  PLANT_DASHBOARD_FILTER_DEFAULTS,
  PLANT_DASHBOARD_FILTER_ENTITY_KEY,
  buildPlantDashboardFilterFields,
  filterValuesToMainFilters,
  mainFiltersToFilterValues,
} from "@/components/core/main-dashboard/utils/plantDashboardFilterBridge";
import { PlantCardsToolbar } from "./PlantCardsToolbar";
import { CardsView } from "./views/CardsView";
import { ListView } from "./views/ListView";
import { MapView } from "./views/MapView";
import { ChartsView } from "./views/ChartsView";

interface PlantCardsWidgetProps {
  plantMetrics: PlantDashboardMetrics[];
  loading?: boolean;
}

export function PlantCardsWidget({ plantMetrics, loading }: PlantCardsWidgetProps) {
  const plantViewMode = useMainDashboardStore((s) => s.plantViewMode);
  const filters = useMainDashboardStore((s) => s.filters);
  const setFilters = useMainDashboardStore((s) => s.setFilters);
  const filteredPlants = useDisplayPlantMetrics(plantMetrics);
  const capacityBounds = usePlantCapacityBounds(plantMetrics);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterValues, setFilterValues] = useState(() => mainFiltersToFilterValues(filters));
  const filterPanelRef = useRef<{ openPanel: () => void }>({
    openPanel: () => setShowFilterPanel(true),
  });
  const tableRef = useRef<CommonTableHandle>(null);

  const plantOptions = useMemo(
    () => plantMetrics.map((p) => ({ value: p.plantId, label: p.plantName })),
    [plantMetrics],
  );

  const filterFields = useMemo(
    () => buildPlantDashboardFilterFields(plantOptions, capacityBounds),
    [plantOptions, capacityBounds],
  );

  return (
    <section
      aria-label="Plant cards"
      className="mt-2 flex min-h-0 flex-1 flex-col gap-2"
    >
      <PlantCardsToolbar
        resultCount={filteredPlants.length}
        allPlants={plantMetrics}
        tableRef={tableRef}
        filterPanelRef={filterPanelRef}
      />

      <CommonFilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filterFields={filterFields}
        filters={filterValues}
        onFiltersChange={setFilterValues}
        onApplyFilters={() => {
          const next = filterValuesToMainFilters(filterValues);
          setFilters({
            ...next,
            search: filters.search,
          });
          setShowFilterPanel(false);
        }}
        onClearFilters={() => {
          setFilterValues({ ...PLANT_DASHBOARD_FILTER_DEFAULTS });
          setFilters({
            ...filterValuesToMainFilters(PLANT_DASHBOARD_FILTER_DEFAULTS),
            search: "",
          });
        }}
        entityKey={PLANT_DASHBOARD_FILTER_ENTITY_KEY}
        defaultFilters={PLANT_DASHBOARD_FILTER_DEFAULTS}
      />

      <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-neutral-200/70 bg-neutral-50/60 dark:border-neutral-800/60 dark:bg-[#06080c]/80">
        {plantViewMode === "cards" ? (
          <CardsView plants={filteredPlants} loading={loading} totalPlants={plantMetrics.length} />
        ) : null}
        {plantViewMode === "list" ? (
          <ListView plants={filteredPlants} loading={loading} tableRef={tableRef} />
        ) : null}
        {plantViewMode === "map" ? <MapView plants={filteredPlants} /> : null}
        {plantViewMode === "charts" ? <ChartsView plants={filteredPlants} /> : null}
      </div>
    </section>
  );
}
