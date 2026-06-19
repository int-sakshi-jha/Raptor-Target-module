import { useMemo } from "react";
import { MainPlantCard } from "../cards/MainPlantCard";
import { PlantCardSkeleton } from "../shared/PlantCardSkeleton";
import type { PlantDashboardMetrics } from "@/components/core/main-dashboard/types/dashboard.types";
import { useMainDashboardBreakpoints } from "@/components/core/main-dashboard/hooks/useMainDashboardBreakpoints";

interface CardsViewProps {
  plants: PlantDashboardMetrics[];
  loading?: boolean;
  totalPlants?: number;
}

export function CardsView({ plants, loading, totalPlants = 0 }: CardsViewProps) {
  const { plantCardsGridCols, isMobile } = useMainDashboardBreakpoints();
  const skeletonCount = plantCardsGridCols * 2;

  const content = useMemo(() => {
    if (loading) {
      return Array.from({ length: skeletonCount }).map((_, i) => (
        <PlantCardSkeleton key={i} />
      ));
    }
    if (!plants.length) {
      const message =
        totalPlants === 0
          ? "No plants found. Plants will appear here once they are available in your account."
          : "No plants match the current filters.";
      return (
        <div className="col-span-full rounded-sm border border-dashed border-neutral-300/80 p-6 text-center text-sm text-neutral-500 dark:border-neutral-dark-400/60 dark:text-neutral-dark-600 sm:p-8">
          {message}
        </div>
      );
    }
    return plants.map((plant) => <MainPlantCard key={plant.plantId} plant={plant} />);
  }, [loading, plants, skeletonCount, totalPlants]);

  return (
    <div className={`h-full min-h-0 overflow-y-auto ${isMobile ? "p-1.5" : "p-2"}`}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${plantCardsGridCols}, minmax(0, 1fr))` }}
      >
        {content}
      </div>
    </div>
  );
}
