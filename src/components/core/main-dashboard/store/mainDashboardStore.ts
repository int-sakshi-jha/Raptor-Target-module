import { create } from "zustand";
import type {
  MainDashboardFilters,
  PlantCardsViewMode,
} from "../types/dashboard.types";
import { DEFAULT_MAIN_DASHBOARD_FILTERS } from "../types/dashboard.types";

interface MainDashboardState {
  plantViewMode: PlantCardsViewMode;
  filters: MainDashboardFilters;
  mapFullscreen: boolean;
  kpiCarouselIndex: number;
  selectedMapPlantId: string | null;
  setPlantViewMode: (mode: PlantCardsViewMode) => void;
  setFilters: (patch: Partial<MainDashboardFilters>) => void;
  resetFilters: () => void;
  setMapFullscreen: (open: boolean) => void;
  setKpiCarouselIndex: (index: number) => void;
  setSelectedMapPlantId: (plantId: string | null) => void;
}

export const useMainDashboardStore = create<MainDashboardState>((set) => ({
  plantViewMode: "cards",
  filters: DEFAULT_MAIN_DASHBOARD_FILTERS,
  mapFullscreen: false,
  kpiCarouselIndex: 0,
  selectedMapPlantId: null,
  setPlantViewMode: (mode) => set({ plantViewMode: mode }),
  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_MAIN_DASHBOARD_FILTERS }),
  setMapFullscreen: (open) => set({ mapFullscreen: open }),
  setKpiCarouselIndex: (index) => set({ kpiCarouselIndex: index }),
  setSelectedMapPlantId: (plantId) => set({ selectedMapPlantId: plantId }),
}));
