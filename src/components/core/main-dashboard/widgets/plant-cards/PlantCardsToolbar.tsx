import { useMemo, type RefObject } from "react";
import {
  BarChart3,
  LayoutGrid,
  List,
  Map,
} from "lucide-react";
import CommonToolbar, {
  buildColumnsAction,
  buildExportAction,
  buildFiltersAction,
} from "@/components/core/table/CommonToolbar";
import type { CommonTableHandle } from "@/components/core/table/CommonTable";
import type { PlantCardsViewMode } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardStore } from "@/components/core/main-dashboard/store/mainDashboardStore";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";

interface PlantCardsToolbarProps {
  resultCount: number;
  allPlants: PlantDashboardMetrics[];
  tableRef: RefObject<CommonTableHandle | null>;
  filterPanelRef: RefObject<{ openPanel: () => void } | null>;
}

const VIEW_TABS = [
  { key: "cards", label: "Cards", icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "list", label: "List", icon: <List className="h-4 w-4" /> },
  { key: "map", label: "Map", icon: <Map className="h-4 w-4" /> },
  { key: "charts", label: "Charts", icon: <BarChart3 className="h-4 w-4" /> },
];

export function PlantCardsToolbar({
  resultCount,
  allPlants,
  tableRef,
  filterPanelRef,
}: PlantCardsToolbarProps) {
  const plantViewMode = useMainDashboardStore((s) => s.plantViewMode);
  const setPlantViewMode = useMainDashboardStore((s) => s.setPlantViewMode);
  const filters = useMainDashboardStore((s) => s.filters);
  const setFilters = useMainDashboardStore((s) => s.setFilters);

  const liveCount = useMemo(
    () => allPlants.filter((p) => p.hasLiveData).length,
    [allPlants],
  );

  const actions = useMemo(() => {
    const base = [buildFiltersAction()];
    if (plantViewMode === "list") {
      base.push(buildColumnsAction(), buildExportAction({ fileName: "plants-dashboard" }));
    }
    return base;
  }, [plantViewMode]);

  return (
    <div className="shrink-0 space-y-1">
      <CommonToolbar
        entityKey="main-dashboard-plants-toolbar"
        search={filters.search}
        onSearchChange={(search) => setFilters({ search })}
        placeholder="Search plants..."
        actions={actions}
        tabs={VIEW_TABS}
        selectedTab={plantViewMode}
        onTabChange={(key) => setPlantViewMode(key as PlantCardsViewMode)}
        filterPanelRef={filterPanelRef}
        tableRef={tableRef}
        className="rounded-sm"
      />
      <p className="px-1 text-[10px] text-neutral-500 dark:text-neutral-dark-600">
        {resultCount} plants
        {liveCount > 0 ? ` · ${liveCount} live` : ""}
      </p>
    </div>
  );
}
